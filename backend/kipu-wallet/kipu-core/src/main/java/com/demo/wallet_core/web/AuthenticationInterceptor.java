package com.demo.wallet_core.web;

import java.util.UUID;

import org.springframework.web.servlet.HandlerInterceptor;

import com.demo.wallet_core.application.AuthService;
import com.demo.wallet_core.application.BusinessException;
import com.demo.wallet_core.application.ErrorCode;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class AuthenticationInterceptor implements HandlerInterceptor {

	public static final String USER_ID = "wallet.userId";

	private static final String BEARER = "Bearer ";

	private final AuthService authService;

	public AuthenticationInterceptor(AuthService authService) {
		this.authService = authService;
	}

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		String header = request.getHeader("Authorization");
		if (header == null || !header.startsWith(BEARER)) {
			throw unauthenticated();
		}
		UUID userId = authService.authenticate(header.substring(BEARER.length()).trim())
			.orElseThrow(AuthenticationInterceptor::unauthenticated);
		request.setAttribute(USER_ID, userId);
		return true;
	}

	private static BusinessException unauthenticated() {
		return new BusinessException(ErrorCode.UNAUTHENTICATED, "Autenticación requerida o sesión expirada.");
	}
}
