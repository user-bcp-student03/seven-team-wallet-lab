package com.demo.wallet_core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import com.demo.wallet_core.domain.RequestKind;
import com.demo.wallet_core.persistence.PaymentRepository;
import com.demo.wallet_core.persistence.PaymentRequestAuditRepository;
import com.jayway.jsonpath.JsonPath;

class PaymentConcurrencyTest extends AbstractIntegrationTest {

	private record Response(int status, String json) {
	}

	@Autowired
	private PaymentRepository payments;

	@Autowired
	private PaymentRequestAuditRepository audits;

	private Response pay(TestUser payer, UUID destination, long amount) throws Exception {
		var result = mvc.perform(post("/api/v1/payments").header("Authorization", "Bearer " + payer.token())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"destinationWalletId\":\"%s\",\"amountCents\":%d}".formatted(destination, amount)))
			.andReturn();
		return new Response(result.getResponse().getStatus(), body(result));
	}

	private List<Response> runConcurrently(List<Callable<Response>> tasks) throws Exception {
		ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
		try {
			CountDownLatch ready = new CountDownLatch(tasks.size());
			CountDownLatch go = new CountDownLatch(1);
			List<Future<Response>> futures = new ArrayList<>();
			for (Callable<Response> task : tasks) {
				futures.add(pool.submit(() -> {
					ready.countDown();
					go.await();
					return task.call();
				}));
			}
			assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
			go.countDown();
			List<Response> responses = new ArrayList<>();
			for (Future<Response> f : futures) {
				responses.add(f.get(60, TimeUnit.SECONDS));
			}
			return responses;
		}
		finally {
			pool.shutdownNow();
		}
	}

	@Test
	void concurrentPaymentsNeverOverdrawAndOnlyAffordableOnesSucceed() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 1000);

		// Montos distintos (claves distintas): con 1000 de saldo solo caben exactamente 3 de los 10.
		List<Callable<Response>> tasks = new ArrayList<>();
		for (int i = 0; i < 10; i++) {
			long amount = 300 + i;
			tasks.add(() -> pay(payer, dest.walletId(), amount));
		}
		List<Response> responses = runConcurrently(tasks);

		assertThat(responses).allSatisfy(r -> assertThat(r.status()).isEqualTo(201));
		long succeeded = responses.stream()
			.filter(r -> "SUCCEEDED".equals(JsonPath.read(r.json(), "$.status")))
			.count();
		long debited = responses.stream()
			.filter(r -> "SUCCEEDED".equals(JsonPath.read(r.json(), "$.status")))
			.mapToLong(r -> ((Number) JsonPath.read(r.json(), "$.amountCents")).longValue())
			.sum();

		assertThat(succeeded).isEqualTo(3);
		assertThat(balance(payer.walletId())).isEqualTo(1000 - debited).isGreaterThanOrEqualTo(0);
		assertThat(balance(dest.walletId())).isEqualTo(debited);
	}

	@Test
	void concurrentEquivalentRequestsCreateASinglePaymentAndASingleDebit() throws Exception {
		TestUser payer = registerUser();
		TestUser dest = registerUser();
		fund(payer.walletId(), 10_000);
		int n = 8;

		List<Callable<Response>> tasks = new ArrayList<>();
		for (int i = 0; i < n; i++) {
			tasks.add(() -> pay(payer, dest.walletId(), 500));
		}
		List<Response> responses = runConcurrently(tasks);

		assertThat(responses.stream().filter(r -> r.status() == 201).count()).isEqualTo(1);
		assertThat(responses.stream().filter(r -> r.status() == 200).count()).isEqualTo(n - 1);
		assertThat(responses.stream().map(r -> (String) JsonPath.read(r.json(), "$.reference")).distinct())
			.hasSize(1);
		assertThat(balance(payer.walletId())).isEqualTo(9500);
		assertThat(balance(dest.walletId())).isEqualTo(500);

		String reference = JsonPath.read(responses.get(0).json(), "$.reference");
		var stored = payments.findByReferenceAndPayerWalletId(reference, payer.walletId()).orElseThrow();
		var trail = audits.findByPaymentId(stored.getId());
		assertThat(trail.stream().filter(a -> a.getKind() == RequestKind.ORIGINAL).count()).isEqualTo(1);
		assertThat(trail.stream().filter(a -> a.getKind() == RequestKind.DUPLICATE).count()).isEqualTo(n - 1);
	}

	@Test
	void crossedPaymentsBetweenTheSameWalletsDoNotDeadlock() throws Exception {
		TestUser a = registerUser();
		TestUser b = registerUser();
		fund(a.walletId(), 10_000);
		fund(b.walletId(), 10_000);

		List<Callable<Response>> tasks = new ArrayList<>();
		for (int i = 0; i < 6; i++) {
			long amount = 100 + i;
			tasks.add(() -> pay(a, b.walletId(), amount));
			tasks.add(() -> pay(b, a.walletId(), amount + 50));
		}
		List<Response> responses = runConcurrently(tasks);

		assertThat(responses).allSatisfy(r -> assertThat(r.status()).isEqualTo(201));
		assertThat(balance(a.walletId()) + balance(b.walletId())).isEqualTo(20_000);
	}
}
