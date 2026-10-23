package com.demo.wallet_core;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.demo.wallet_core.persistence.WalletRepository;
import com.jayway.jsonpath.JsonPath;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

	protected record TestUser(String email, UUID walletId, String token) {
	}

	private static final AtomicLong SEQ = new AtomicLong(20_000_000);

	@Autowired
	protected MockMvc mvc;

	@Autowired
	protected WalletRepository wallets;

	@Autowired
	private PlatformTransactionManager transactionManager;

	/** Registra un usuario sintetico por el flujo real de onboarding y abre sesion. */
	protected TestUser registerUser() throws Exception {
		long n = SEQ.incrementAndGet();
		String email = "user" + n + "@example.test";
		String id = JsonPath.read(body(mvc.perform(post("/api/v1/onboardings")).andExpect(status().isCreated())
			.andReturn()), "$.onboardingId");
		mvc.perform(put("/api/v1/onboardings/{id}/steps/identity", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"dni\":\"%d\",\"names\":\"Persona Prueba %d\"}".formatted(n, n))).andExpect(status().isOk());
		mvc.perform(put("/api/v1/onboardings/{id}/steps/contact", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"%s\",\"phone\":\"9%08d\"}".formatted(email, n % 100_000_000L)))
			.andExpect(status().isOk());
		MvcResult done = mvc.perform(post("/api/v1/onboardings/{id}/complete", id)).andExpect(status().isOk())
			.andReturn();
		UUID walletId = UUID.fromString(JsonPath.read(body(done), "$.walletId"));
		return new TestUser(email, walletId, login(email));
	}

	protected String login(String email) throws Exception {
		MvcResult result = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"%s\"}".formatted(email))).andExpect(status().isOk()).andReturn();
		return JsonPath.read(body(result), "$.accessToken");
	}

	protected void fund(UUID walletId, long cents) {
		new TransactionTemplate(transactionManager)
			.executeWithoutResult(s -> wallets.findById(walletId).orElseThrow().credit(cents));
	}

	protected long balance(UUID walletId) {
		return wallets.findById(walletId).orElseThrow().getBalanceCents();
	}

	protected static String body(MvcResult result) throws Exception {
		return result.getResponse().getContentAsString();
	}
}
