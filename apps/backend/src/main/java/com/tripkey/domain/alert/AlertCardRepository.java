package com.tripkey.domain.alert;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlertCardRepository extends JpaRepository<AlertCard, Long> {

    List<AlertCard> findAllByTripIdOrderByCreatedAtAsc(UUID tripId);

    void deleteAllByJobId(UUID jobId);
}
