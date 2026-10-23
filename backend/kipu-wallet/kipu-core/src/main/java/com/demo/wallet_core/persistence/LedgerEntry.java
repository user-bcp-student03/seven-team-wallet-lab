package com.demo.wallet_core.persistence;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.demo.wallet_core.domain.EntryDirection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ledger_entry")
public class LedgerEntry {

	@Id
	private UUID id;

	@Column(name = "payment_id", nullable = false)
	private UUID paymentId;

	@Column(name = "wallet_id", nullable = false)
	private UUID walletId;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private EntryDirection direction;

	@Column(name = "amount_cents", nullable = false)
	private long amountCents;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected LedgerEntry() {
	}

	public LedgerEntry(UUID paymentId, UUID walletId, EntryDirection direction, long amountCents, Instant createdAt) {
		this.id = UUID.randomUUID();
		this.paymentId = paymentId;
		this.walletId = walletId;
		this.direction = direction;
		this.amountCents = amountCents;
		this.createdAt = createdAt;
	}

	public UUID getWalletId() {
		return walletId;
	}

	public EntryDirection getDirection() {
		return direction;
	}

	public long getAmountCents() {
		return amountCents;
	}
}
