package com.demo.wallet_core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import com.jayway.jsonpath.JsonPath;

/** Evita que swagger.json se desfase de los endpoints /api/v1 realmente mapeados. */
class OpenApiContractTest extends AbstractIntegrationTest {

	private static final String PREFIX = "/api/v1";

	@Autowired
	@Qualifier("requestMappingHandlerMapping")
	private RequestMappingHandlerMapping handlerMapping;

	private String contract() throws Exception {
		try (InputStream in = new ClassPathResource("static/swagger.json").getInputStream()) {
			return new String(in.readAllBytes(), StandardCharsets.UTF_8);
		}
	}

	@Test
	void contractEndpointsMatchMappedEndpoints() throws Exception {
		Map<String, Map<String, Object>> paths = JsonPath.read(contract(), "$.paths");
		Set<String> documented = new HashSet<>();
		paths.forEach((path, operations) -> {
			if (path.startsWith(PREFIX)) {
				operations.keySet().forEach(method -> documented.add(method.toUpperCase(Locale.ROOT) + " " + path));
			}
		});

		Set<String> mapped = new HashSet<>();
		for (RequestMappingInfo info : handlerMapping.getHandlerMethods().keySet()) {
			Set<String> patterns = info.getPathPatternsCondition().getPatternValues();
			patterns.stream().filter(p -> p.startsWith(PREFIX)).forEach(p -> info.getMethodsCondition()
				.getMethods()
				.forEach(m -> mapped.add(m.name() + " " + p)));
		}

		assertThat(mapped).isNotEmpty();
		assertThat(documented).isEqualTo(mapped);
	}

	@Test
	void everyOperationHasUniqueIdAndProtectedPaymentsDeclareBearerAuth() throws Exception {
		String json = contract();
		java.util.List<String> ids = JsonPath.read(json, "$.paths.*.*.operationId");
		assertThat(ids).doesNotHaveDuplicates();
		assertThat((Object) JsonPath.read(json, "$.paths['/api/v1/payments'].post.security[0].bearerAuth"))
			.isNotNull();
		assertThat((Object) JsonPath.read(json, "$.paths['/api/v1/payments/history'].get.security[0].bearerAuth"))
			.isNotNull();
	}

	@Test
	void contractIsServedAsStaticResource() throws Exception {
		mvc.perform(get("/swagger.json")).andExpect(status().isOk());
	}
}
