package com.demo.wallet_core.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class DomainRulesTest {

	private static final UUID PAYER = UUID.fromString("00000000-0000-0000-0000-000000000001");

	private static final UUID DEST = UUID.fromString("00000000-0000-0000-0000-000000000002");

	private static final Duration WINDOW = Duration.ofMinutes(5);

	@Test
	void paymentApprovedWhenBalanceCoversAmountExactly() {
		PaymentPolicy.Decision d = PaymentPolicy.decide(1000, 1000);
		assertThat(d.status()).isEqualTo(PaymentStatus.SUCCEEDED);
		assertThat(d.failureReason()).isNull();
		assertThat(d.nextAction()).isEqualTo(NextAction.NONE);
	}

	@Test
	void paymentRejectedWhenBalanceIsOneCentShort() {
		PaymentPolicy.Decision d = PaymentPolicy.decide(999, 1000);
		assertThat(d.status()).isEqualTo(PaymentStatus.FAILED);
		assertThat(d.failureReason()).isEqualTo(FailureReason.INSUFFICIENT_FUNDS);
		assertThat(d.nextAction()).isEqualTo(NextAction.BACK);
	}

	@Test
	void nextActionPerTerminalStatus() {
		assertThat(PaymentPolicy.nextActionFor(PaymentStatus.SUCCEEDED)).isEqualTo(NextAction.NONE);
		assertThat(PaymentPolicy.nextActionFor(PaymentStatus.FAILED)).isEqualTo(NextAction.BACK);
		assertThat(PaymentPolicy.nextActionFor(PaymentStatus.EXPIRED)).isEqualTo(NextAction.RETRY);
	}

	@Test
	void sameRequestInsideWindowProducesSameKey() {
		Instant t = Instant.parse("2026-01-01T10:00:10Z");
		String a = IdempotencyKeyFactory.create(PAYER, 500, DEST, t, WINDOW);
		String b = IdempotencyKeyFactory.create(PAYER, 500, DEST, t.plusSeconds(120), WINDOW);
		assertThat(a).isEqualTo(b).hasSize(64);
	}

	@Test
	void keyChangesWithPayerAmountDestinationOrWindow() {
		Instant t = Instant.parse("2026-01-01T10:00:10Z");
		String base = IdempotencyKeyFactory.create(PAYER, 500, DEST, t, WINDOW);
		assertThat(IdempotencyKeyFactory.create(DEST, 500, PAYER, t, WINDOW)).isNotEqualTo(base);
		assertThat(IdempotencyKeyFactory.create(PAYER, 501, DEST, t, WINDOW)).isNotEqualTo(base);
		assertThat(IdempotencyKeyFactory.create(PAYER, 500, PAYER, t, WINDOW)).isNotEqualTo(base);
		assertThat(IdempotencyKeyFactory.create(PAYER, 500, DEST, t.plus(WINDOW), WINDOW)).isNotEqualTo(base);
	}

	@Test
	void nonPositiveWindowIsRejected() {
		assertThatThrownBy(
				() -> IdempotencyKeyFactory.create(PAYER, 500, DEST, Instant.now(), Duration.ZERO))
			.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void namesAreMaskedExceptFirstName() {
		assertThat(NameMasker.mask("Ana Maria Lopez")).isEqualTo("Ana M. L.");
		assertThat(NameMasker.mask("  beto  ")).isEqualTo("beto");
	}
}
