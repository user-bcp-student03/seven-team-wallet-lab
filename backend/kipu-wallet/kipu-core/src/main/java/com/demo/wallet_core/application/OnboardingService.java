package com.demo.wallet_core.application;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.demo.wallet_core.application.OnboardingView.StepView;
import com.demo.wallet_core.domain.EventType;
import com.demo.wallet_core.domain.OnboardingStatus;
import com.demo.wallet_core.domain.OnboardingStep;
import com.demo.wallet_core.persistence.AppUser;
import com.demo.wallet_core.persistence.AppUserRepository;
import com.demo.wallet_core.persistence.Onboarding;
import com.demo.wallet_core.persistence.OnboardingRepository;
import com.demo.wallet_core.persistence.Wallet;
import com.demo.wallet_core.persistence.WalletRepository;

@Service
public class OnboardingService {

	private final OnboardingRepository onboardings;

	private final AppUserRepository users;

	private final WalletRepository wallets;

	private final EventRecorder events;

	private final Clock clock;

	public OnboardingService(OnboardingRepository onboardings, AppUserRepository users, WalletRepository wallets,
			EventRecorder events, Clock clock) {
		this.onboardings = onboardings;
		this.users = users;
		this.wallets = wallets;
		this.events = events;
		this.clock = clock;
	}

	@Transactional
	public OnboardingView start(RequestContext ctx) {
		Onboarding onboarding = onboardings
			.save(new Onboarding(UUID.randomUUID(), ctx.correlationId(), clock.instant()));
		events.record(EventType.ONBOARDING_STARTED, null, null, onboarding.getId(), ctx.correlationId());
		return view(onboarding);
	}

	@Transactional(readOnly = true)
	public OnboardingView get(UUID id) {
		return view(load(id));
	}

	@Transactional
	public OnboardingView submitIdentity(UUID id, String dni, String names, RequestContext ctx) {
		Onboarding onboarding = loadInProgress(id);
		boolean firstTime = !onboarding.hasIdentity();
		onboarding.setIdentity(dni.trim(), names.trim());
		if (firstTime) {
			events.record(EventType.ONBOARDING_STEP_COMPLETED, OnboardingStep.IDENTITY.name(), null, id,
					ctx.correlationId());
		}
		return view(onboarding);
	}

	@Transactional
	public OnboardingView submitContact(UUID id, String email, String phone, RequestContext ctx) {
		Onboarding onboarding = loadInProgress(id);
		if (!onboarding.hasIdentity()) {
			throw new BusinessException(ErrorCode.STEP_OUT_OF_ORDER,
					"Completa primero el paso de identidad (DNI y nombres).");
		}
		boolean firstTime = !onboarding.hasContact();
		onboarding.setContact(normalizeEmail(email), phone.trim());
		if (firstTime) {
			events.record(EventType.ONBOARDING_STEP_COMPLETED, OnboardingStep.CONTACT.name(), null, id,
					ctx.correlationId());
		}
		return view(onboarding);
	}

	@Transactional
	public OnboardingView complete(UUID id, RequestContext ctx) {
		Onboarding onboarding = loadInProgress(id);
		if (!onboarding.hasIdentity() || !onboarding.hasContact()) {
			throw new BusinessException(ErrorCode.ONBOARDING_INCOMPLETE,
					"Faltan pasos por completar: siguiente paso " + currentStep(onboarding) + ".");
		}
		if (users.existsByEmailOrDni(onboarding.getEmail(), onboarding.getDni())) {
			throw new BusinessException(ErrorCode.REGISTRATION_CONFLICT,
					"No fue posible completar el registro con los datos proporcionados.");
		}
		var now = clock.instant();
		AppUser user = users.save(new AppUser(UUID.randomUUID(), onboarding.getEmail(), onboarding.getDni(),
				onboarding.getNames(), onboarding.getPhone(), now));
		wallets.save(new Wallet(UUID.randomUUID(), user.getId(), now));
		onboarding.complete(user.getId(), now);
		events.record(EventType.ONBOARDING_STEP_COMPLETED, OnboardingStep.CONFIRMATION.name(), user.getId(), id,
				ctx.correlationId());
		events.record(EventType.ONBOARDING_COMPLETED, null, user.getId(), id, ctx.correlationId());
		return view(onboarding);
	}

	public static String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private Onboarding load(UUID id) {
		return onboardings.findById(id)
			.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Onboarding no encontrado."));
	}

	private Onboarding loadInProgress(UUID id) {
		Onboarding onboarding = load(id);
		if (onboarding.getStatus() == OnboardingStatus.COMPLETED) {
			throw new BusinessException(ErrorCode.ONBOARDING_ALREADY_COMPLETED, "El onboarding ya fue completado.");
		}
		return onboarding;
	}

	private OnboardingStep currentStep(Onboarding onboarding) {
		if (!onboarding.hasIdentity()) {
			return OnboardingStep.IDENTITY;
		}
		if (!onboarding.hasContact()) {
			return OnboardingStep.CONTACT;
		}
		return OnboardingStep.CONFIRMATION;
	}

	private OnboardingView view(Onboarding onboarding) {
		boolean completed = onboarding.getStatus() == OnboardingStatus.COMPLETED;
		OnboardingStep current = completed ? null : currentStep(onboarding);
		List<StepView> steps = new ArrayList<>();
		for (OnboardingStep step : OnboardingStep.values()) {
			String state = completed || (current != null && step.ordinal() < current.ordinal()) ? "COMPLETED"
					: step == current ? "CURRENT" : "PENDING";
			steps.add(new StepView(step, state));
		}
		UUID walletId = completed ? wallets.findByUserId(onboarding.getUserId()).map(Wallet::getId).orElse(null)
				: null;
		return new OnboardingView(onboarding.getId(), onboarding.getStatus(), current, steps, walletId);
	}
}
