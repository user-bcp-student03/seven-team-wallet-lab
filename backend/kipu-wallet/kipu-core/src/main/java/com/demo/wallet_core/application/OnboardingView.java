package com.demo.wallet_core.application;

import java.util.List;
import java.util.UUID;

import com.demo.wallet_core.domain.OnboardingStatus;
import com.demo.wallet_core.domain.OnboardingStep;

public record OnboardingView(UUID onboardingId, OnboardingStatus status, OnboardingStep currentStep,
		List<StepView> steps, UUID walletId) {

	public record StepView(OnboardingStep step, String state) {
	}
}
