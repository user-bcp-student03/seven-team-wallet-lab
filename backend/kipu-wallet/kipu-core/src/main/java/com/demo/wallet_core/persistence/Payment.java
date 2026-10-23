package com.demo.wallet_core.persistence;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.demo.wallet_core.domain.FailureReason;
import com.demo.wallet_core.domain.PaymentStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "payment")
public class Payment {

	@Id
	private UUID id;

	@Column(nullable = false)
	private String reference;

	@Column(name = "payer_wallet_id", nullable = false)
	private UUID payerWalletId;

	@Column(name = "destination_wallet_id", nullable = false)
	private UUID destinationWalletId;

	@Column(name = "amount_cents", nullable = false)
	private long amountCents;

	@Column(nullable = false)
	private String currency;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private PaymentStatus status;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(name = "failure_reason")
	private FailureReason failureReason;

	@Column(name = "idempotency_key", nullable = false)
	private String idempotencyKey;

	@Column(name = "correlation_id", nullable = false)
	private String correlationId;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Payment() {
	}

	public Payment(UUID id, String reference, UUID payerWalletId, UUID destinationWalletId, long amountCents,
			PaymentStatus status, FailureReason failureReason, String idempotencyKey, String correlationId,
			Instant createdAt) {
		this.id = id;
		this.reference = reference;
		this.payerWalletId = payerWalletId;
		this.destinationWalletId = destinationWalletId;
		this.amountCents = amountCents;
		this.currency = "PEN";
		this.status = status;
		this.failureReason = failureReason;
		this.idempotencyKey = idempotencyKey;
		this.correlationId = correlationId;
		this.createdAt = createdAt;
	}

	public UUID getId() {
		return id;
	}

	public String getReference() {
		return reference;
	}

	public UUID getPayerWalletId() {
		return payerWalletId;
	}

	public UUID getDestinationWalletId() {
		return destinationWalletId;
	}

	public long getAmountCents() {
		return amountCents;
	}

	public String getCurrency() {
		return currency;
	}

	public PaymentStatus getStatus() {
		return status;
	}

	public FailureReason getFailureReason() {
		return failureReason;
	}

	public String getIdempotencyKey() {
		return idempotencyKey;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
