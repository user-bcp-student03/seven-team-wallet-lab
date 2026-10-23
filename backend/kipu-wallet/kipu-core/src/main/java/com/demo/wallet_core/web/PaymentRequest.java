package com.demo.wallet_core.web;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PaymentRequest(@NotNull(message = "El destino es obligatorio.") UUID destinationWalletId,
		@NotNull(message = "El monto es obligatorio.") @Positive(
				message = "El monto debe ser mayor a cero (en céntimos).") Long amountCents) {
}
