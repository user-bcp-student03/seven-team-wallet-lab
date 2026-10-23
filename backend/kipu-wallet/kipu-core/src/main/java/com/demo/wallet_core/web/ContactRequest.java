package com.demo.wallet_core.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ContactRequest(
		@NotBlank(message = "El correo es obligatorio.") @Email(message = "Ingresa un correo válido.") @Size(
				max = 254, message = "El correo no puede superar 254 caracteres.") String email,
		@NotBlank(message = "El celular es obligatorio.") @Pattern(regexp = "9\\d{8}",
				message = "El celular debe tener 9 dígitos y empezar con 9.") String phone) {
}
