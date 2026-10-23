package com.demo.wallet_core.persistence;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

	boolean existsByEmailOrDni(String email, String dni);

	java.util.Optional<AppUser> findByEmail(String email);
}
