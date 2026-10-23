package com.demo.wallet_core.application;

import java.time.Instant;
import java.util.UUID;

import com.demo.wallet_core.domain.FailureReason;
import com.demo.wallet_core.domain.NextAction;
import com.demo.wallet_core.domain.PaymentStatus;

public final class PaymentViews {

	private PaymentViews() {
	}

	public record DestinationView(UUID walletId, String displayName) {
	}

	public record PaymentPreview(DestinationView destination, long amountCents, String currency) {
	}

	public record PaymentView(String reference, PaymentStatus status, long amountCents, String currency,
			DestinationView destination, FailureReason failureReason, NextAction nextAction, Instant createdAt) {
	}

	/** replay=true cuando la solicitud repite un intento equivalente y se devuelve el resultado original. */
	public record PaymentOutcome(PaymentView payment, boolean replay) {
	}
}
