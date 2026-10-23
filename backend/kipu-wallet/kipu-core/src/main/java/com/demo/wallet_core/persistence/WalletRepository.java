package com.demo.wallet_core.persistence;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {

	Optional<Wallet> findByUserId(UUID userId);

	/** Bloquea las filas en orden de id para evitar interbloqueos entre pagos cruzados. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select w from Wallet w where w.id in :ids order by w.id")
	List<Wallet> lockAllByIdOrdered(@Param("ids") Collection<UUID> ids);
}
