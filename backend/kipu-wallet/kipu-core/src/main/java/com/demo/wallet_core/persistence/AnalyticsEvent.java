package com.demo.wallet_core.persistence;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.demo.wallet_core.domain.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "analytics_event")
public class AnalyticsEvent {

	@Id
	private UUID id;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private EventType type;

	private String detail;

	@Column(name = "user_ref")
	private UUID userRef;

	@Column(name = "onboarding_id")
	private UUID onboardingId;

	@Column(name = "correlation_id", nullable = false)
	private String correlationId;

	@Column(name = "occurred_at", nullable = false)
	private Instant occurredAt;

	protected AnalyticsEvent() {
	}

	public AnalyticsEvent(EventType type, String detail, UUID userRef, UUID onboardingId, String correlationId,
			Instant occurredAt) {
		this.id = UUID.randomUUID();
		this.type = type;
		this.detail = detail;
		this.userRef = userRef;
		this.onboardingId = onboardingId;
		this.correlationId = correlationId;
		this.occurredAt = occurredAt;
	}

	public EventType getType() {
		return type;
	}

	public String getDetail() {
		return detail;
	}

	public UUID getUserRef() {
		return userRef;
	}

	public UUID getOnboardingId() {
		return onboardingId;
	}

	public String getCorrelationId() {
		return correlationId;
	}
}
