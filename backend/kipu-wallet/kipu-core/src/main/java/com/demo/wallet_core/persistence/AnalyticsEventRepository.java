package com.demo.wallet_core.persistence;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.demo.wallet_core.domain.EventType;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, UUID> {

	List<AnalyticsEvent> findByOnboardingIdOrderByOccurredAtAsc(UUID onboardingId);

	long countByType(EventType type);
}
