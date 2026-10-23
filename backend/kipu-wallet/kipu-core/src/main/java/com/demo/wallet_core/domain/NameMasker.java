package com.demo.wallet_core.domain;

import java.util.Arrays;
import java.util.stream.Collectors;

/** Identidad visible del destino sin exponer sus nombres completos. */
public final class NameMasker {

	private NameMasker() {
	}

	public static String mask(String fullNames) {
		String[] parts = fullNames.trim().split("\\s+");
		if (parts.length == 1) {
			return parts[0];
		}
		String rest = Arrays.stream(parts)
			.skip(1)
			.map(p -> p.substring(0, 1).toUpperCase() + ".")
			.collect(Collectors.joining(" "));
		return parts[0] + " " + rest;
	}
}
