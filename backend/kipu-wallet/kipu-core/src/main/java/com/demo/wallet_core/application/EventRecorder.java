package com.demo.wallet_core.application;

import java.time.Clock;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.demo.wallet_core.domain.EventType;
import com.demo.wallet_core.persistence.AnalyticsEvent;
import com.demo.wallet_core.persistence.AnalyticsEventRepository;

/** Persiste el evento en la misma transaccion que el cambio de dominio que lo origina. */
@Component
public class EventRecorder {

	private final AnalyticsEventRepository events;

	private final Clock clock;

	public EventRecorder(AnalyticsEventRepository events, Clock clock) {
		this.events = events;
		this.clock = clock;
	}

	@Transactional(propagation = Propagation.MANDATORY)
	public void record(EventType type, String detail, UUID userRef, UUID onboardingId, String correlationId) {
		events.save(new AnalyticsEvent(type, detail, userRef, onboardingId, correlationId, clock.instant()));
	}
}
