package com.demo.wallet_core.application;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.demo.wallet_core.domain.PaymentStatus;
import com.demo.wallet_core.domain.RequestKind;
import com.demo.wallet_core.persistence.WalletRepository;

/** Conciliacion: lee la vista SQL autoritativa, acotada a los pagos del solicitante. */
@Service
public class ReconciliationService {

	public record ReconciliationRow(UUID auditId, RequestKind kind, String paymentReference,
			PaymentStatus paymentStatus, long amountCents, String idempotencyKey, String requestId,
			String correlationId, Instant receivedAt) {
	}

	private final JdbcClient jdbc;

	private final WalletRepository wallets;

	public ReconciliationService(JdbcClient jdbc, WalletRepository wallets) {
		this.jdbc = jdbc;
		this.wallets = wallets;
	}

	@Transactional(readOnly = true)
	public List<ReconciliationRow> forUser(UUID userId) {
		UUID walletId = wallets.findByUserId(userId)
			.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED, "Sesión inválida."))
			.getId();
		return jdbc.sql("""
				SELECT audit_id, kind, payment_reference, payment_status, amount_cents, idempotency_key,
				       request_id, correlation_id, received_at
				FROM payment_reconciliation_v
				WHERE payer_wallet_id = :walletId
				ORDER BY received_at DESC, audit_id
				""")
			.param("walletId", walletId)
			.query((rs, rowNum) -> new ReconciliationRow(rs.getObject("audit_id", UUID.class),
					RequestKind.valueOf(rs.getString("kind")), rs.getString("payment_reference"),
					PaymentStatus.valueOf(rs.getString("payment_status")), rs.getLong("amount_cents"),
					rs.getString("idempotency_key"), rs.getString("request_id"), rs.getString("correlation_id"),
					rs.getObject("received_at", OffsetDateTime.class).toInstant()))
			.list();
	}
}
