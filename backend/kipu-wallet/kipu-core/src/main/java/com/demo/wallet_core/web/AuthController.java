package com.demo.wallet_core.web;

import java.time.Instant;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.demo.wallet_core.application.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

	public record LoginResponse(String accessToken, String tokenType, Instant expiresAt) {
	}

	private final AuthService service;

	public AuthController(AuthService service) {
		this.service = service;
	}

	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest body) {
		AuthService.LoginResult result = service.login(body.email());
		return new LoginResponse(result.accessToken(), "Bearer", result.expiresAt());
	}
}
