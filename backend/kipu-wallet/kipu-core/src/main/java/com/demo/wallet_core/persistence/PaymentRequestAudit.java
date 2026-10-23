package com.demo.wallet_core.persistence;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.demo.wallet_core.domain.PaymentStatus;
import com.demo.wallet_core.domain.RequestKind;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "payment_request_audit")
public class PaymentRequestAudit {

	@Id
	private UUID id;

	@Column(name = "payment_id", nullable = false)
	private UUID paymentId;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private RequestKind kind;

	@Column(name = "idempotency_key", nullable = false)
	private String idempotencyKey;

	@Column(name = "request_id", nullable = false)
	private String requestId;

	@Column(name = "correlation_id", nullable = false)
	private String correlationId;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(name = "outcome_status", nullable = false)
	private PaymentStatus outcomeStatus;

	@Column(name = "received_at", nullable = false)
	private Instant receivedAt;

	protected PaymentRequestAudit() {
	}

	public PaymentRequestAudit(UUID paymentId, RequestKind kind, String idempotencyKey, String requestId,
			String correlationId, PaymentStatus outcomeStatus, Instant receivedAt) {
		this.id = UUID.randomUUID();
		this.paymentId = paymentId;
		this.kind = kind;
		this.idempotencyKey = idempotencyKey;
		this.requestId = requestId;
		this.correlationId = correlationId;
		this.outcomeStatus = outcomeStatus;
		this.receivedAt = receivedAt;
	}

	public UUID getPaymentId() {
		return paymentId;
	}

	public RequestKind getKind() {
		return kind;
	}

	public String getRequestId() {
		return requestId;
	}

	public String getCorrelationId() {
		return correlationId;
	}
}
