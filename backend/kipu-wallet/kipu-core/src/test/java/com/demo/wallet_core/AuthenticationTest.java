package com.demo.wallet_core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import com.demo.wallet_core.domain.IdempotencyKeyFactory;
import com.demo.wallet_core.persistence.AuthSession;
import com.demo.wallet_core.persistence.AuthSessionRepository;

class AuthenticationTest extends AbstractIntegrationTest {

	@Autowired
	private AuthSessionRepository sessions;

	@Test
	void unknownUserGetsControlledErrorWithoutSensitiveInfo() throws Exception {
		String email = "inexistente@example.test";
		mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"%s\"}".formatted(email)))
			.andExpect(status().isUnauthorized())
			.andExpect(header().string("WWW-Authenticate", "Bearer"))
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
			.andExpect(jsonPath("$.detail").value("Credenciales inválidas."))
			.andExpect(result -> assertThat(body(result)).doesNotContain(email));
	}

	@Test
	void paymentsRequireAuthentication() throws Exception {
		mvc.perform(get("/api/v1/payments/history")).andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
		mvc.perform(post("/api/v1/payments").contentType(MediaType.APPLICATION_JSON)
			.content("{\"destinationWalletId\":\"%s\",\"amountCents\":100}".formatted(UUID.randomUUID())))
			.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/payments/history").header("Authorization", "Bearer token-invalido"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void validTokenIsAcceptedAndExpiredTokenRejected() throws Exception {
		TestUser user = registerUser();
		mvc.perform(get("/api/v1/payments/history").header("Authorization", "Bearer " + user.token()))
			.andExpect(status().isOk());

		String expired = "token-expirado-sintetico";
		sessions.save(new AuthSession(UUID.randomUUID(), wallets.findById(user.walletId()).orElseThrow().getUserId(),
				IdempotencyKeyFactory.sha256Hex(expired), Instant.now().minusSeconds(120),
				Instant.now().minusSeconds(60)));
		mvc.perform(get("/api/v1/payments/history").header("Authorization", "Bearer " + expired))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void correlationIdIsEchoedOnlyWhenSafe() throws Exception {
		mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
			.header("X-Correlation-Id", "corr-123")
			.content("{\"email\":\"a@example.test\"}")).andExpect(header().string("X-Correlation-Id", "corr-123"));
		mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
			.header("X-Correlation-Id", "mal formado!")
			.content("{\"email\":\"a@example.test\"}"))
			.andExpect(result -> assertThat(result.getResponse().getHeader("X-Correlation-Id"))
				.isNotEqualTo("mal formado!"));
	}
}
