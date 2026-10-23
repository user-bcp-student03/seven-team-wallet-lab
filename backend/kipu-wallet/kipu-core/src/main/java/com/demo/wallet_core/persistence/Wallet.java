package com.demo.wallet_core.persistence;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.demo.wallet_core.domain.WalletStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "wallet")
public class Wallet {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private WalletStatus status;

	@Column(name = "balance_cents", nullable = false)
	private long balanceCents;

	@Column(nullable = false)
	private String currency;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Wallet() {
	}

	public Wallet(UUID id, UUID userId, Instant createdAt) {
		this.id = id;
		this.userId = userId;
		this.status = WalletStatus.ACTIVE;
		this.balanceCents = 0;
		this.currency = "PEN";
		this.createdAt = createdAt;
	}

	public void debit(long amountCents) {
		if (amountCents <= 0 || amountCents > balanceCents) {
			throw new IllegalStateException("Debito invalido");
		}
		balanceCents -= amountCents;
	}

	public void credit(long amountCents) {
		if (amountCents <= 0) {
			throw new IllegalStateException("Credito invalido");
		}
		balanceCents += amountCents;
	}

	public boolean isActive() {
		return status == WalletStatus.ACTIVE;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public long getBalanceCents() {
		return balanceCents;
	}

	public String getCurrency() {
		return currency;
	}
}
