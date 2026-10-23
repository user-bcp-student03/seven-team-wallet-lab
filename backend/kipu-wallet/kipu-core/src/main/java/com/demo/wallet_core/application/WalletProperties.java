package com.demo.wallet_core.application;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Decisiones de negocio externalizadas: no tienen valor por defecto en el codigo. */
@Validated
@ConfigurationProperties("wallet")
public record WalletProperties(@Valid @NotNull Payments payments, @Valid @NotNull Idempotency idempotency,
		@Valid @NotNull Auth auth) {

	public record Payments(@Positive long maxAmountCents) {
	}

	public record Idempotency(@NotNull Duration window) {

		public Idempotency {
			if (window != null && window.toSeconds() <= 0) {
				throw new IllegalArgumentException("wallet.idempotency.window debe ser positivo");
			}
		}
	}

	public record Auth(@NotNull Duration tokenTtl) {
	}
}
