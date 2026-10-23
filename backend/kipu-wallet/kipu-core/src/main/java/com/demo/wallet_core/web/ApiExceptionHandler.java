package com.demo.wallet_core.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.demo.wallet_core.application.BusinessException;
import com.demo.wallet_core.application.ErrorCode;
import com.demo.wallet_core.application.RequestContext;

/** Los errores no incluyen valores enviados por el usuario ni detalles de persistencia. */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

	@ExceptionHandler(BusinessException.class)
	ResponseEntity<ProblemDetail> handleBusiness(BusinessException ex) {
		HttpStatus status = statusOf(ex.getCode());
		ResponseEntity.BodyBuilder builder = ResponseEntity.status(status);
		if (status == HttpStatus.UNAUTHORIZED) {
			builder.header(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
		}
		return builder.body(problem(status, ex.getCode(), ex.getMessage()));
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	ResponseEntity<ProblemDetail> handleIntegrity(DataIntegrityViolationException ex, WebRequest request) {
		logUnexpected(ex, request);
		return ResponseEntity.status(HttpStatus.CONFLICT)
			.body(problem(HttpStatus.CONFLICT, ErrorCode.REGISTRATION_CONFLICT,
					"No fue posible completar la operación con los datos proporcionados."));
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ProblemDetail> handleUnexpected(Exception ex, WebRequest request) {
		logUnexpected(ex, request);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
			.body(ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
					"Ocurrió un error inesperado. Intenta nuevamente."));
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		ex.getBindingResult()
			.getFieldErrors()
			.forEach(fe -> errors.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
		ProblemDetail body = problem(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR,
				"Hay datos inválidos o faltantes. Corrígelos para continuar.");
		body.setProperty("errors", errors);
		return ResponseEntity.badRequest().body(body);
	}

	private static ProblemDetail problem(HttpStatus status, ErrorCode code, String detail) {
		ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
		pd.setTitle(code.name());
		pd.setProperty("code", code.name());
		return pd;
	}

	private static HttpStatus statusOf(ErrorCode code) {
		return switch (code) {
			case VALIDATION_ERROR -> HttpStatus.BAD_REQUEST;
			case INVALID_CREDENTIALS, UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
			case NOT_FOUND -> HttpStatus.NOT_FOUND;
			case STEP_OUT_OF_ORDER, ONBOARDING_INCOMPLETE, ONBOARDING_ALREADY_COMPLETED, REGISTRATION_CONFLICT ->
				HttpStatus.CONFLICT;
			case AMOUNT_ABOVE_LIMIT, SAME_WALLET, DESTINATION_UNAVAILABLE -> HttpStatus.UNPROCESSABLE_ENTITY;
		};
	}

	/** Solo tipos de excepcion y requestId: los mensajes de persistencia pueden contener datos personales. */
	private static void logUnexpected(Exception ex, WebRequest request) {
		Object ctx = request.getAttribute(CorrelationFilter.ATTRIBUTE, WebRequest.SCOPE_REQUEST);
		String requestId = ctx instanceof RequestContext rc ? rc.requestId() : "n/a";
		Throwable root = ex;
		while (root.getCause() != null) {
			root = root.getCause();
		}
		log.error("Error no controlado type={} rootType={} requestId={}", ex.getClass().getName(),
				root.getClass().getName(), requestId);
	}
}
