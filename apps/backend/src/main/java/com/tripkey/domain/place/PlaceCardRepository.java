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

    List<PlaceCard> findAllByTripIdAndDay(UUID tripId, Integer day);

    Optional<PlaceCard> findByInstanceIdAndTripId(UUID instanceId, UUID tripId);

    boolean existsByTripIdAndCategoryAndFlightNumber(UUID tripId, String category, String flightNumber);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("delete from PlaceCard p where p.tripId = :tripId")
    void deleteAllByTripId(@Param("tripId") UUID tripId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("update PlaceCard p set p.pendingReorder = false where p.tripId = :tripId and p.pendingReorder = true")
    int markAllReordered(@Param("tripId") UUID tripId);

    @Query(value = """
            select instance_id,
                   st_clusterdbscan(st_transform(geom, 3857), :epsMeters, :minPts) over () as cluster_id
            from place_cards
            where trip_id = :tripId
              and is_excluded = false
              and placement_status in ('ready', 'ready_partial')
              and processing_status = 'completed'
              and geom is not null
            """, nativeQuery = true)
    List<Object[]> clusterAvailableCards(
            @Param("tripId") UUID tripId,
            @Param("epsMeters") double epsMeters,
            @Param("minPts") int minPts);

    @Query(value = """
            select c1.instance_id as id_a,
                   c2.instance_id as id_b,
                   c1.day as day,
                   st_distancesphere(c1.geom, c2.geom) as distance_meters
              from place_cards c1
              join place_cards c2
                on c1.trip_id = c2.trip_id
               and c1.day = c2.day
               and c2.day_order = c1.day_order + 1
             where c1.trip_id = :tripId
               and c1.is_excluded = false
               and c2.is_excluded = false
               and c1.geom is not null
               and c2.geom is not null
               and c1.day is not null
               and c1.day_order is not null
            """, nativeQuery = true)
    List<Object[]> findAdjacentCardDistances(@Param("tripId") UUID tripId);
}
