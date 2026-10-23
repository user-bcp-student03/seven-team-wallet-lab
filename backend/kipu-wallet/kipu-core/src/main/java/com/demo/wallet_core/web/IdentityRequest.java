package com.demo.wallet_core.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record IdentityRequest(
		@NotBlank(message = "El DNI es obligatorio.") @Pattern(regexp = "\\d{8}",
				message = "El DNI debe tener exactamente 8 dígitos.") String dni,
		@NotBlank(message = "Los nombres son obligatorios.") @Size(max = 150,
				message = "Los nombres no pueden superar 150 caracteres.") String names) {
}
