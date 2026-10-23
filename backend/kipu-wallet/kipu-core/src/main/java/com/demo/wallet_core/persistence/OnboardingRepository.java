package com.demo.wallet_core.persistence;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OnboardingRepository extends JpaRepository<Onboarding, UUID> {
}
