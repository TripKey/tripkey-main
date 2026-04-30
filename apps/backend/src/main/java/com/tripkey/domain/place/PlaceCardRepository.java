package com.tripkey.domain.place;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlaceCardRepository extends JpaRepository<PlaceCard, UUID> {

    List<PlaceCard> findAllByTripId(UUID tripId);

    Optional<PlaceCard> findByInstanceIdAndTripId(UUID instanceId, UUID tripId);

    boolean existsByTripIdAndCategoryAndFlightNumber(UUID tripId, String category, String flightNumber);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("delete from PlaceCard p where p.tripId = :tripId")
    void deleteAllByTripId(@Param("tripId") UUID tripId);
}
