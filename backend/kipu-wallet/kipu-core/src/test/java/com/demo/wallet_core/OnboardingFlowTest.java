package com.demo.wallet_core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import com.demo.wallet_core.domain.EventType;
import com.demo.wallet_core.persistence.AnalyticsEvent;
import com.demo.wallet_core.persistence.AnalyticsEventRepository;
import com.demo.wallet_core.persistence.OnboardingRepository;
import com.jayway.jsonpath.JsonPath;

class OnboardingFlowTest extends AbstractIntegrationTest {

	@Autowired
	private AnalyticsEventRepository events;

	@Autowired
	private OnboardingRepository onboardings;

	private String start() throws Exception {
		MvcResult r = mvc.perform(post("/api/v1/onboardings")).andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("IN_PROGRESS"))
			.andExpect(jsonPath("$.currentStep").value("IDENTITY"))
			.andExpect(jsonPath("$.steps.length()").value(3))
			.andReturn();
		return JsonPath.read(body(r), "$.onboardingId");
	}

	@Test
	void completeFlowShowsCurrentStepActivatesWalletAndEmitsEvents() throws Exception {
		String id = start();

		mvc.perform(put("/api/v1/onboardings/{id}/steps/identity", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"dni\":\"31000001\",\"names\":\"Persona Uno\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.currentStep").value("CONTACT"))
			.andExpect(jsonPath("$.steps[0].state").value("COMPLETED"))
			.andExpect(jsonPath("$.steps[1].state").value("CURRENT"));

		mvc.perform(put("/api/v1/onboardings/{id}/steps/contact", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"Persona.Uno@Example.test\",\"phone\":\"911111111\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.currentStep").value("CONFIRMATION"));

		mvc.perform(post("/api/v1/onboardings/{id}/complete", id))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("COMPLETED"))
			.andExpect(jsonPath("$.currentStep").doesNotExist())
			.andExpect(jsonPath("$.walletId").isNotEmpty());

		List<String> types = events.findByOnboardingIdOrderByOccurredAtAsc(UUID.fromString(id))
			.stream()
			.map(this::label)
			.toList();
		assertThat(types).containsExactlyInAnyOrder("ONBOARDING_STARTED", "ONBOARDING_STEP_COMPLETED:IDENTITY",
				"ONBOARDING_STEP_COMPLETED:CONTACT", "ONBOARDING_STEP_COMPLETED:CONFIRMATION",
				"ONBOARDING_COMPLETED");
		assertThat(events.findByOnboardingIdOrderByOccurredAtAsc(UUID.fromString(id)))
			.filteredOn(e -> e.getType() == EventType.ONBOARDING_COMPLETED)
			.allSatisfy(e -> assertThat(e.getUserRef()).isNotNull());

		// Los datos personales ya no quedan en la fila de progreso del onboarding.
		var stored = onboardings.findById(UUID.fromString(id)).orElseThrow();
		assertThat(stored.getDni()).isNull();
		assertThat(stored.getEmail()).isNull();

		// El correo se normaliza: el login funciona con otra capitalizacion.
		mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"persona.uno@example.test\"}")).andExpect(status().isOk());
	}

	private String label(AnalyticsEvent e) {
		return e.getDetail() == null ? e.getType().name() : e.getType().name() + ":" + e.getDetail();
	}

	@Test
	void invalidDataBlocksProgressWithActionableMessagesAndNoEcho() throws Exception {
		String id = start();
		mvc.perform(put("/api/v1/onboardings/{id}/steps/identity", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"dni\":\"abc\",\"names\":\" \"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
			.andExpect(jsonPath("$.errors.dni").value("El DNI debe tener exactamente 8 dígitos."))
			.andExpect(jsonPath("$.errors.names").value("Los nombres son obligatorios."))
			.andExpect(result -> assertThat(body(result)).doesNotContain("abc"));

		mvc.perform(get("/api/v1/onboardings/{id}", id))
			.andExpect(jsonPath("$.currentStep").value("IDENTITY"));
	}

	@Test
	void invalidContactIsRejected() throws Exception {
		String id = start();
		mvc.perform(put("/api/v1/onboardings/{id}/steps/identity", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"dni\":\"31000002\",\"names\":\"Persona Dos\"}")).andExpect(status().isOk());
		mvc.perform(put("/api/v1/onboardings/{id}/steps/contact", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"no-es-correo\",\"phone\":\"123\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.email").value("Ingresa un correo válido."))
			.andExpect(jsonPath("$.errors.phone").value("El celular debe tener 9 dígitos y empezar con 9."));
	}

	@Test
	void contactBeforeIdentityAndEarlyCompletionAreBlocked() throws Exception {
		String id = start();
		mvc.perform(put("/api/v1/onboardings/{id}/steps/contact", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"orden@example.test\",\"phone\":\"911111112\"}"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("STEP_OUT_OF_ORDER"));
		mvc.perform(post("/api/v1/onboardings/{id}/complete", id))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("ONBOARDING_INCOMPLETE"));
	}

	@Test
	void completedOnboardingCannotBeModifiedAndUnknownIdIs404() throws Exception {
		TestUser user = registerUser();
		assertThat(user.walletId()).isNotNull();
		mvc.perform(get("/api/v1/onboardings/{id}", UUID.randomUUID())).andExpect(status().isNotFound());
		mvc.perform(put("/api/v1/onboardings/{id}/steps/identity", UUID.randomUUID())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"dni\":\"31000003\",\"names\":\"X\"}")).andExpect(status().isNotFound());
	}

	@Test
	void duplicateRegistrationIsRejectedWithoutRevealingWhichFieldClashed() throws Exception {
		TestUser existing = registerUser();
		String id = start();
		mvc.perform(put("/api/v1/onboardings/{id}/steps/identity", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"dni\":\"31000004\",\"names\":\"Otra Persona\"}")).andExpect(status().isOk());
		mvc.perform(put("/api/v1/onboardings/{id}/steps/contact", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"%s\",\"phone\":\"911111113\"}".formatted(existing.email())))
			.andExpect(status().isOk());
		mvc.perform(post("/api/v1/onboardings/{id}/complete", id))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("REGISTRATION_CONFLICT"))
			.andExpect(result -> assertThat(body(result)).doesNotContain(existing.email()));
	}
}
