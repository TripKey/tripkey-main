package com.tripkey.domain.place;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlaceCardRepository extends JpaRepository<PlaceCard, UUID> {

    List<PlaceCard> findAllByTripId(UUID tripId);

    void deleteAllByTripId(UUID tripId);
}
