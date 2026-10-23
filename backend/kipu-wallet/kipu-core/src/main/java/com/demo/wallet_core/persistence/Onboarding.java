package com.demo.wallet_core.persistence;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.demo.wallet_core.domain.OnboardingStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "onboarding")
public class Onboarding {

	@Id
	private UUID id;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private OnboardingStatus status;

	private String dni;

	private String names;

	private String email;

	private String phone;

	@Column(name = "user_id")
	private UUID userId;

	@Column(name = "correlation_id", nullable = false)
	private String correlationId;

	@Column(name = "started_at", nullable = false)
	private Instant startedAt;

	@Column(name = "completed_at")
	private Instant completedAt;

	protected Onboarding() {
	}

	public Onboarding(UUID id, String correlationId, Instant startedAt) {
		this.id = id;
		this.status = OnboardingStatus.IN_PROGRESS;
		this.correlationId = correlationId;
		this.startedAt = startedAt;
	}

	public boolean hasIdentity() {
		return dni != null && names != null;
	}

	public boolean hasContact() {
		return email != null && phone != null;
	}

	public void setIdentity(String dni, String names) {
		this.dni = dni;
		this.names = names;
	}

	public void setContact(String email, String phone) {
		this.email = email;
		this.phone = phone;
	}

	/** Los datos personales pasan a AppUser; aqui solo queda el progreso. */
	public void complete(UUID userId, Instant now) {
		this.status = OnboardingStatus.COMPLETED;
		this.userId = userId;
		this.completedAt = now;
		this.dni = null;
		this.names = null;
		this.email = null;
		this.phone = null;
	}

	public UUID getId() {
		return id;
	}

	public OnboardingStatus getStatus() {
		return status;
	}

	public String getDni() {
		return dni;
	}

	public String getNames() {
		return names;
	}

	public String getEmail() {
		return email;
	}

	public String getPhone() {
		return phone;
	}

	public UUID getUserId() {
		return userId;
	}
}
