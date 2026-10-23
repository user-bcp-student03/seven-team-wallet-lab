package com.demo.wallet_core.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.demo.wallet_core.domain.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

	Optional<Payment> findByIdempotencyKey(String idempotencyKey);

	Optional<Payment> findByReferenceAndPayerWalletId(String reference, UUID payerWalletId);

	List<Payment> findByPayerWalletIdAndStatusOrderByCreatedAtDesc(UUID payerWalletId, PaymentStatus status);
}
