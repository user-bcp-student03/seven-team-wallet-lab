package com.demo.wallet_core.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.demo.wallet_core.application.PaymentService;
import com.demo.wallet_core.application.PaymentViews.PaymentOutcome;
import com.demo.wallet_core.application.PaymentViews.PaymentPreview;
import com.demo.wallet_core.application.PaymentViews.PaymentView;
import com.demo.wallet_core.application.ReconciliationService;
import com.demo.wallet_core.application.ReconciliationService.ReconciliationRow;
import com.demo.wallet_core.application.RequestContext;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

	private final PaymentService payments;

	private final ReconciliationService reconciliation;

	public PaymentController(PaymentService payments, ReconciliationService reconciliation) {
		this.payments = payments;
		this.reconciliation = reconciliation;
	}

	@PostMapping("/preview")
	public PaymentPreview preview(@RequestAttribute(AuthenticationInterceptor.USER_ID) UUID userId,
			@Valid @RequestBody PaymentRequest body) {
		return payments.preview(userId, body.destinationWalletId(), body.amountCents());
	}

	/** 201 para un intento nuevo; 200 cuando es una repeticion equivalente y se devuelve el resultado original. */
	@PostMapping
	public ResponseEntity<PaymentView> pay(@RequestAttribute(AuthenticationInterceptor.USER_ID) UUID userId,
			@RequestAttribute(CorrelationFilter.ATTRIBUTE) RequestContext ctx,
			@Valid @RequestBody PaymentRequest body) {
		PaymentOutcome outcome = payments.pay(userId, body.destinationWalletId(), body.amountCents(), ctx);
		return ResponseEntity.status(outcome.replay() ? HttpStatus.OK : HttpStatus.CREATED).body(outcome.payment());
	}

	@GetMapping("/history")
	public List<PaymentView> history(@RequestAttribute(AuthenticationInterceptor.USER_ID) UUID userId) {
		return payments.history(userId);
	}

	@GetMapping("/reconciliation")
	public List<ReconciliationRow> reconciliation(
			@RequestAttribute(AuthenticationInterceptor.USER_ID) UUID userId) {
		return reconciliation.forUser(userId);
	}

	@GetMapping("/{reference}")
	public PaymentView get(@RequestAttribute(AuthenticationInterceptor.USER_ID) UUID userId,
			@PathVariable String reference) {
		return payments.get(userId, reference);
	}
}
