package com.tripkey.domain.dump;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DumpJobRepository extends JpaRepository<DumpJob, UUID> {

    Optional<DumpJob> findByJobIdAndTripId(UUID jobId, UUID tripId);

    Optional<DumpJob> findFirstByTripIdOrderByCreatedAtDesc(UUID tripId);
}
