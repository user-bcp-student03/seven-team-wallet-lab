package com.demo.wallet_core.application;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.demo.wallet_core.domain.IdempotencyKeyFactory;
import com.demo.wallet_core.persistence.AppUser;
import com.demo.wallet_core.persistence.AppUserRepository;
import com.demo.wallet_core.persistence.AuthSession;
import com.demo.wallet_core.persistence.AuthSessionRepository;

/**
 * Autenticacion PROVISIONAL (solo correo): pendiente de aprobar proveedor/protocolo y credenciales.
 */
@Service
public class AuthService {

	public record LoginResult(String accessToken, Instant expiresAt) {
	}

	private final AppUserRepository users;

	private final AuthSessionRepository sessions;

	private final WalletProperties properties;

	private final Clock clock;

	private final SecureRandom random = new SecureRandom();

	public AuthService(AppUserRepository users, AuthSessionRepository sessions, WalletProperties properties,
			Clock clock) {
		this.users = users;
		this.sessions = sessions;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional
	public LoginResult login(String email) {
		AppUser user = users.findByEmail(OnboardingService.normalizeEmail(email))
			.orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS, "Credenciales inválidas."));
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		Instant now = clock.instant();
		Instant expiresAt = now.plus(properties.auth().tokenTtl());
		sessions.save(new AuthSession(UUID.randomUUID(), user.getId(), IdempotencyKeyFactory.sha256Hex(token), now,
				expiresAt));
		return new LoginResult(token, expiresAt);
	}

	@Transactional(readOnly = true)
	public Optional<UUID> authenticate(String token) {
		return sessions.findByTokenHashAndExpiresAtAfter(IdempotencyKeyFactory.sha256Hex(token), clock.instant())
			.map(AuthSession::getUserId);
	}
}
