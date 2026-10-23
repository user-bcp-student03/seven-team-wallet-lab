package com.demo.wallet_core.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

/** Clave determinista por pagador, monto, destino y ventana de intento. */
public final class IdempotencyKeyFactory {

	private IdempotencyKeyFactory() {
	}

	public static String create(UUID payerWalletId, long amountCents, UUID destinationWalletId, Instant now,
			Duration window) {
		long windowSeconds = window.toSeconds();
		if (windowSeconds <= 0) {
			throw new IllegalArgumentException("La ventana de idempotencia debe ser positiva");
		}
		long bucket = Math.floorDiv(now.getEpochSecond(), windowSeconds);
		String material = payerWalletId + "|" + amountCents + "|" + destinationWalletId + "|" + bucket;
		return sha256Hex(material);
	}

	public static String sha256Hex(String value) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 no disponible", e);
		}
	}
}
