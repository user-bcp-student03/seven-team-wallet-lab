package com.demo.wallet_core.domain;

/** Regla de saldo: un pago solo se aprueba si el saldo disponible cubre el monto. */
public final class PaymentPolicy {

	public record Decision(PaymentStatus status, FailureReason failureReason, NextAction nextAction) {
	}

	private PaymentPolicy() {
	}

	public static Decision decide(long payerBalanceCents, long amountCents) {
		if (payerBalanceCents >= amountCents) {
			return new Decision(PaymentStatus.SUCCEEDED, null, NextAction.NONE);
		}
		return new Decision(PaymentStatus.FAILED, FailureReason.INSUFFICIENT_FUNDS, NextAction.BACK);
	}

	public static NextAction nextActionFor(PaymentStatus status) {
		return switch (status) {
			case SUCCEEDED -> NextAction.NONE;
			case FAILED -> NextAction.BACK;
			case EXPIRED -> NextAction.RETRY;
		};
	}
}
