package com.demo.wallet_core.application;

/** Identificadores de trazabilidad de la solicitud HTTP en curso. */
public record RequestContext(String requestId, String correlationId) {
}
