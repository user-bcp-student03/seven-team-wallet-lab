package com.demo.wallet_core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.demo.wallet_core.domain.EventType;
import com.demo.wallet_core.domain.RequestKind;
import com.demo.wallet_core.persistence.AnalyticsEventRepository;
import com.demo.wallet_core.persistence.LedgerEntryRepository;
import com.demo.wallet_core.persistence.PaymentRepository;
import com.demo.wallet_core.persistence.PaymentRequestAuditRepository;
import com.jayway.jsonpath.JsonPath;

class PaymentFlowTest extends AbstractIntegrationTest {

	@Autowired
	private PaymentRepository payments;

	@Autowired
	private LedgerEntryRepository ledger;

	@Autowired
	private PaymentRequestAuditRepository audits;

	@Autowired
	private AnalyticsEventRepository events;

	protected ResultActions pay(TestUser payer, UUID destination, long amount, String correlationId) throws Exception {
		return mvc.perform(post("/api/v1/payments").header("Authorization", "Bearer " + payer.token())
			.header("X-Correlation-Id", correlationId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"destinationWalletId\":\"%s\",\"amountCents\":%d}".formatted(destination, amount)));
	}

	private ResultActions pay(TestUser payer, UUID destination, long amount) throws Exception {
		return pay(payer, destination, amount, "corr-" + UUID.randomUUID());
	}

	@Test
	void previewShowsDestinationAndAmountWithoutMovingMoney() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 5000);

		mvc.perform(post("/api/v1/payments/preview").header("Authorization", "Bearer " + payer.token())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"destinationWalletId\":\"%s\",\"amountCents\":1200}".formatted(dest.walletId())))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.destination.walletId").value(dest.walletId().toString()))
			.andExpect(jsonPath("$.destination.displayName").value(org.hamcrest.Matchers.startsWith("Persona P.")))
			.andExpect(jsonPath("$.amountCents").value(1200))
			.andExpect(jsonPath("$.currency").value("PEN"));

		assertThat(balance(payer.walletId())).isEqualTo(5000);
	}

	@Test
	void successfulPaymentMovesMoneyPersistsReferenceHistoryLedgerAndActivationEvent() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 10_000);
		long activationBefore = events.countByType(EventType.PAYMENT_SUCCEEDED);

		String json = body(pay(payer, dest.walletId(), 2500).andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("SUCCEEDED"))
			.andExpect(jsonPath("$.nextAction").value("NONE"))
			.andExpect(jsonPath("$.failureReason").doesNotExist())
			.andExpect(jsonPath("$.reference").value(org.hamcrest.Matchers.startsWith("PAY-")))
			.andReturn());
		String reference = JsonPath.read(json, "$.reference");

		assertThat(balance(payer.walletId())).isEqualTo(7500);
		assertThat(balance(dest.walletId())).isEqualTo(2500);

		var stored = payments.findByReferenceAndPayerWalletId(reference, payer.walletId()).orElseThrow();
		assertThat(ledger.findByPaymentId(stored.getId())).hasSize(2);
		assertThat(events.countByType(EventType.PAYMENT_SUCCEEDED)).isEqualTo(activationBefore + 1);

		mvc.perform(get("/api/v1/payments/history").header("Authorization", "Bearer " + payer.token()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].reference").value(reference));
		mvc.perform(get("/api/v1/payments/{ref}", reference).header("Authorization", "Bearer " + payer.token()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("SUCCEEDED"));
		// Ownership: otro usuario autenticado no puede leer el pago.
		mvc.perform(get("/api/v1/payments/{ref}", reference).header("Authorization", "Bearer " + dest.token()))
			.andExpect(status().isNotFound());
	}

	@Test
	void insufficientFundsFailsWithNextActionAndNoDebit() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 1000);
		long activationBefore = events.countByType(EventType.PAYMENT_SUCCEEDED);

		pay(payer, dest.walletId(), 2000).andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("FAILED"))
			.andExpect(jsonPath("$.failureReason").value("INSUFFICIENT_FUNDS"))
			.andExpect(jsonPath("$.nextAction").value("BACK"));

		assertThat(balance(payer.walletId())).isEqualTo(1000);
		assertThat(balance(dest.walletId())).isZero();
		assertThat(events.countByType(EventType.PAYMENT_SUCCEEDED)).isEqualTo(activationBefore);
		mvc.perform(get("/api/v1/payments/history").header("Authorization", "Bearer " + payer.token()))
			.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void repeatedEquivalentRequestReturnsOriginalResultWithoutSecondDebit() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 10_000);

		String first = body(pay(payer, dest.walletId(), 700, "corr-original").andExpect(status().isCreated())
			.andReturn());
		String second = body(pay(payer, dest.walletId(), 700, "corr-duplicate").andExpect(status().isOk())
			.andReturn());

		String reference = JsonPath.read(first, "$.reference");
		assertThat(JsonPath.<String>read(second, "$.reference")).isEqualTo(reference);
		assertThat(balance(payer.walletId())).isEqualTo(9300);
		assertThat(balance(dest.walletId())).isEqualTo(700);

		var stored = payments.findByReferenceAndPayerWalletId(reference, payer.walletId()).orElseThrow();
		var trail = audits.findByPaymentId(stored.getId());
		assertThat(trail).extracting("kind").containsExactlyInAnyOrder(RequestKind.ORIGINAL, RequestKind.DUPLICATE);
		assertThat(trail).extracting("correlationId").containsExactlyInAnyOrder("corr-original", "corr-duplicate");
		assertThat(trail).allSatisfy(a -> assertThat(a.getRequestId()).isNotBlank());

		// Conciliacion distingue original de duplicado.
		String recon = body(mvc.perform(get("/api/v1/payments/reconciliation")
			.header("Authorization", "Bearer " + payer.token())).andExpect(status().isOk()).andReturn());
		List<String> kinds = JsonPath.read(recon, "$[?(@.paymentReference=='%s')].kind".formatted(reference));
		assertThat(kinds).containsExactlyInAnyOrder("ORIGINAL", "DUPLICATE");

		// El otro usuario no ve filas ajenas.
		mvc.perform(get("/api/v1/payments/reconciliation").header("Authorization", "Bearer " + dest.token()))
			.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void differentAmountIsADifferentPayment() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 10_000);

		pay(payer, dest.walletId(), 100).andExpect(status().isCreated());
		pay(payer, dest.walletId(), 101).andExpect(status().isCreated());
		assertThat(balance(payer.walletId())).isEqualTo(9799);
	}

	@Test
	void repeatedFailureReturnsTheSameFailureOriginal() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 10);

		String first = body(pay(payer, dest.walletId(), 500).andExpect(status().isCreated()).andReturn());
		fund(payer.walletId(), 100_000);
		pay(payer, dest.walletId(), 500).andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("FAILED"))
			.andExpect(jsonPath("$.reference").value((String) JsonPath.read(first, "$.reference")));
	}

	@Test
	void invalidPaymentRequestsAreRejectedBeforeSubmission() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 100_000);

		pay(payer, dest.walletId(), 50_001).andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.code").value("AMOUNT_ABOVE_LIMIT"))
			.andExpect(jsonPath("$.detail").value("El monto supera el límite permitido de S/ 500.00."));
		pay(payer, payer.walletId(), 100).andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.code").value("SAME_WALLET"));
		pay(payer, UUID.randomUUID(), 100).andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.code").value("DESTINATION_UNAVAILABLE"));
		pay(payer, dest.walletId(), 0).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.amountCents").value("El monto debe ser mayor a cero (en céntimos)."));
		mvc.perform(post("/api/v1/payments").header("Authorization", "Bearer " + payer.token())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{}")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.destinationWalletId").exists());
		assertThat(balance(payer.walletId())).isEqualTo(100_000);
	}

	@Test
	void unknownReferenceIs404() throws Exception {
		TestUser payer = registerUser();
		mvc.perform(get("/api/v1/payments/{ref}", "PAY-NOEXISTE").header("Authorization", "Bearer " + payer.token()))
			.andExpect(status().isNotFound());
	}
}
