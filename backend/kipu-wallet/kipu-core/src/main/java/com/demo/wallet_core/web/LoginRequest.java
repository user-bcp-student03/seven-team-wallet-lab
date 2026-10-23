package com.demo.wallet_core.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
		@NotBlank(message = "El correo es obligatorio.") @Email(message = "Ingresa un correo válido.") String email) {
}
