package com.demo.wallet_core.web;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.demo.wallet_core.application.OnboardingService;
import com.demo.wallet_core.application.OnboardingView;
import com.demo.wallet_core.application.RequestContext;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/onboardings")
public class OnboardingController {

	private final OnboardingService service;

	public OnboardingController(OnboardingService service) {
		this.service = service;
	}

	@PostMapping
	public ResponseEntity<OnboardingView> start(@RequestAttribute(CorrelationFilter.ATTRIBUTE) RequestContext ctx) {
		return ResponseEntity.status(HttpStatus.CREATED).body(service.start(ctx));
	}

	@GetMapping("/{id}")
	public OnboardingView get(@PathVariable UUID id) {
		return service.get(id);
	}

	@PutMapping("/{id}/steps/identity")
	public OnboardingView identity(@PathVariable UUID id, @Valid @RequestBody IdentityRequest body,
			@RequestAttribute(CorrelationFilter.ATTRIBUTE) RequestContext ctx) {
		return service.submitIdentity(id, body.dni(), body.names(), ctx);
	}

	@PutMapping("/{id}/steps/contact")
	public OnboardingView contact(@PathVariable UUID id, @Valid @RequestBody ContactRequest body,
			@RequestAttribute(CorrelationFilter.ATTRIBUTE) RequestContext ctx) {
		return service.submitContact(id, body.email(), body.phone(), ctx);
	}

	@PostMapping("/{id}/complete")
	public OnboardingView complete(@PathVariable UUID id,
			@RequestAttribute(CorrelationFilter.ATTRIBUTE) RequestContext ctx) {
		return service.complete(id, ctx);
	}
}
