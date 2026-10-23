package com.demo.wallet_core.application;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.demo.wallet_core.application.PaymentViews.DestinationView;
import com.demo.wallet_core.application.PaymentViews.PaymentOutcome;
import com.demo.wallet_core.application.PaymentViews.PaymentPreview;
import com.demo.wallet_core.application.PaymentViews.PaymentView;
import com.demo.wallet_core.domain.EntryDirection;
import com.demo.wallet_core.domain.EventType;
import com.demo.wallet_core.domain.IdempotencyKeyFactory;
import com.demo.wallet_core.domain.NameMasker;
import com.demo.wallet_core.domain.PaymentPolicy;
import com.demo.wallet_core.domain.PaymentStatus;
import com.demo.wallet_core.domain.RequestKind;
import com.demo.wallet_core.persistence.AppUserRepository;
import com.demo.wallet_core.persistence.LedgerEntry;
import com.demo.wallet_core.persistence.LedgerEntryRepository;
import com.demo.wallet_core.persistence.Payment;
import com.demo.wallet_core.persistence.PaymentRepository;
import com.demo.wallet_core.persistence.PaymentRequestAudit;
import com.demo.wallet_core.persistence.PaymentRequestAuditRepository;
import com.demo.wallet_core.persistence.Wallet;
import com.demo.wallet_core.persistence.WalletRepository;

@Service
public class PaymentService {

	private final WalletRepository wallets;

	private final AppUserRepository users;

	private final PaymentRepository payments;

	private final LedgerEntryRepository ledger;

	private final PaymentRequestAuditRepository audits;

	private final EventRecorder events;

	private final WalletProperties properties;

	private final Clock clock;

	private final TransactionTemplate tx;

	public PaymentService(WalletRepository wallets, AppUserRepository users, PaymentRepository payments,
			LedgerEntryRepository ledger, PaymentRequestAuditRepository audits, EventRecorder events,
			WalletProperties properties, Clock clock, PlatformTransactionManager transactionManager) {
		this.wallets = wallets;
		this.users = users;
		this.payments = payments;
		this.ledger = ledger;
		this.audits = audits;
		this.events = events;
		this.properties = properties;
		this.clock = clock;
		this.tx = new TransactionTemplate(transactionManager);
	}

	@Transactional(readOnly = true)
	public PaymentPreview preview(UUID userId, UUID destinationWalletId, long amountCents) {
		Wallet payer = payerWallet(userId);
		validate(payer, destinationWalletId, amountCents);
		return new PaymentPreview(destination(destinationWalletId), amountCents, "PEN");
	}

	/**
	 * Procesa el pago. Toda la logica financiera ocurre en una unica transaccion local; no hay llamadas externas.
	 */
	public PaymentOutcome pay(UUID userId, UUID destinationWalletId, long amountCents, RequestContext ctx) {
		Wallet payer = payerWallet(userId);
		validate(payer, destinationWalletId, amountCents);
		UUID payerId = payer.getId();
		String key = IdempotencyKeyFactory.create(payerId, amountCents, destinationWalletId, clock.instant(),
				properties.idempotency().window());
		try {
			return tx.execute(status -> execute(payerId, userId, destinationWalletId, amountCents, key, ctx));
		}
		catch (DataIntegrityViolationException e) {
			// Carrera perdida contra la restriccion unica: la transaccion hizo rollback sin debito.
			return tx.execute(status -> replay(payments.findByIdempotencyKey(key)
				.orElseThrow(() -> new IllegalStateException("Violacion de integridad no atribuible a la clave", e)),
					key, ctx));
		}
	}

	@Transactional(readOnly = true)
	public List<PaymentView> history(UUID userId) {
		Wallet payer = payerWallet(userId);
		List<Payment> succeeded = payments.findByPayerWalletIdAndStatusOrderByCreatedAtDesc(payer.getId(),
				PaymentStatus.SUCCEEDED);
		return toViews(succeeded);
	}

	@Transactional(readOnly = true)
	public PaymentView get(UUID userId, String reference) {
		Wallet payer = payerWallet(userId);
		Payment payment = payments.findByReferenceAndPayerWalletId(reference, payer.getId())
			.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Pago no encontrado."));
		return toViews(List.of(payment)).get(0);
	}

	private PaymentOutcome execute(UUID payerId, UUID userId, UUID destinationId, long amountCents, String key,
			RequestContext ctx) {
		Optional<Payment> existing = payments.findByIdempotencyKey(key);
		if (existing.isPresent()) {
			return replay(existing.get(), key, ctx);
		}
		Map<UUID, Wallet> locked = wallets.lockAllByIdOrdered(List.of(payerId, destinationId))
			.stream()
			.collect(Collectors.toMap(Wallet::getId, Function.identity()));
		Wallet payer = locked.get(payerId);
		Wallet destination = locked.get(destinationId);
		if (payer == null || destination == null || !destination.isActive()) {
			throw new BusinessException(ErrorCode.DESTINATION_UNAVAILABLE, "El destino no está disponible.");
		}
		// Segunda verificacion con las billeteras bloqueadas: serializa solicitudes equivalentes concurrentes.
		existing = payments.findByIdempotencyKey(key);
		if (existing.isPresent()) {
			return replay(existing.get(), key, ctx);
		}
		PaymentPolicy.Decision decision = PaymentPolicy.decide(payer.getBalanceCents(), amountCents);
		var now = clock.instant();
		Payment payment = payments.save(new Payment(UUID.randomUUID(), newReference(), payerId, destinationId,
				amountCents, decision.status(), decision.failureReason(), key, ctx.correlationId(), now));
		if (decision.status() == PaymentStatus.SUCCEEDED) {
			payer.debit(amountCents);
			destination.credit(amountCents);
			ledger.save(new LedgerEntry(payment.getId(), payerId, EntryDirection.DEBIT, amountCents, now));
			ledger.save(new LedgerEntry(payment.getId(), destinationId, EntryDirection.CREDIT, amountCents, now));
			events.record(EventType.PAYMENT_SUCCEEDED, null, userId, null, ctx.correlationId());
		}
		audits.save(new PaymentRequestAudit(payment.getId(), RequestKind.ORIGINAL, key, ctx.requestId(),
				ctx.correlationId(), payment.getStatus(), now));
		return new PaymentOutcome(toViews(List.of(payment)).get(0), false);
	}

	private PaymentOutcome replay(Payment original, String key, RequestContext ctx) {
		audits.save(new PaymentRequestAudit(original.getId(), RequestKind.DUPLICATE, key, ctx.requestId(),
				ctx.correlationId(), original.getStatus(), clock.instant()));
		return new PaymentOutcome(toViews(List.of(original)).get(0), true);
	}

	private void validate(Wallet payer, UUID destinationWalletId, long amountCents) {
		if (payer.getId().equals(destinationWalletId)) {
			throw new BusinessException(ErrorCode.SAME_WALLET, "No puedes pagarte a ti mismo.");
		}
		long max = properties.payments().maxAmountCents();
		if (amountCents > max) {
			throw new BusinessException(ErrorCode.AMOUNT_ABOVE_LIMIT,
					"El monto supera el límite permitido de S/ " + BigDecimal.valueOf(max, 2) + ".");
		}
		destination(destinationWalletId);
	}

	private Wallet payerWallet(UUID userId) {
		return wallets.findByUserId(userId)
			.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED, "Sesión inválida."));
	}

	private DestinationView destination(UUID walletId) {
		Wallet wallet = wallets.findById(walletId)
			.filter(Wallet::isActive)
			.orElseThrow(() -> new BusinessException(ErrorCode.DESTINATION_UNAVAILABLE,
					"El destino no está disponible."));
		String names = users.findById(wallet.getUserId())
			.orElseThrow(() -> new BusinessException(ErrorCode.DESTINATION_UNAVAILABLE,
					"El destino no está disponible."))
			.getNames();
		return new DestinationView(walletId, NameMasker.mask(names));
	}

	private List<PaymentView> toViews(List<Payment> list) {
		Map<UUID, DestinationView> cache = new HashMap<>();
		return list.stream()
			.map(p -> new PaymentView(p.getReference(), p.getStatus(), p.getAmountCents(), p.getCurrency(),
					cache.computeIfAbsent(p.getDestinationWalletId(), this::destination), p.getFailureReason(),
					PaymentPolicy.nextActionFor(p.getStatus()), p.getCreatedAt()))
			.toList();
	}

	private static String newReference() {
		return "PAY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
	}
}
