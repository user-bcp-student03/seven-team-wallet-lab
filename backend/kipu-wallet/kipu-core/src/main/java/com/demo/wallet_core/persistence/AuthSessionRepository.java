package com.demo.wallet_core.persistence;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {

	Optional<AuthSession> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);
}
