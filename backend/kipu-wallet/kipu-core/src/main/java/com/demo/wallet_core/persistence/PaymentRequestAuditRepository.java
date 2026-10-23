package com.demo.wallet_core.persistence;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRequestAuditRepository extends JpaRepository<PaymentRequestAudit, UUID> {

	List<PaymentRequestAudit> findByPaymentId(UUID paymentId);
}
