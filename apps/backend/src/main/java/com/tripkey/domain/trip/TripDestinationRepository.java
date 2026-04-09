package com.tripkey.domain.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TripDestinationRepository extends JpaRepository<TripDestination, Long> {

    List<TripDestination> findByTripTripIdOrderBySortOrder(UUID tripId);
}
