package com.demo.wallet_core.web;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.demo.wallet_core.application.RequestContext;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** El requestId lo genera el servidor; el correlationId del cliente solo se acepta si tiene formato seguro. */
@Component
public class CorrelationFilter extends OncePerRequestFilter {

	public static final String ATTRIBUTE = "wallet.requestContext";

	public static final String CORRELATION_HEADER = "X-Correlation-Id";

	public static final String REQUEST_HEADER = "X-Request-Id";

	private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9_-]{1,64}");

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String requestId = UUID.randomUUID().toString();
		String incoming = request.getHeader(CORRELATION_HEADER);
		String correlationId = incoming != null && SAFE_ID.matcher(incoming).matches() ? incoming : requestId;
		request.setAttribute(ATTRIBUTE, new RequestContext(requestId, correlationId));
		response.setHeader(REQUEST_HEADER, requestId);
		response.setHeader(CORRELATION_HEADER, correlationId);
		MDC.put("requestId", requestId);
		MDC.put("correlationId", correlationId);
		try {
			chain.doFilter(request, response);
		}
		finally {
			MDC.remove("requestId");
			MDC.remove("correlationId");
		}
	}
}
