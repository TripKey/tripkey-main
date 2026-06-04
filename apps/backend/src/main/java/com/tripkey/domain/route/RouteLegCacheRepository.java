package com.tripkey.domain.route;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RouteLegCacheRepository extends JpaRepository<RouteLegCache, Long> {

    Optional<RouteLegCache> findByOriginLatAndOriginLngAndDestLatAndDestLng(
            double originLat, double originLng, double destLat, double destLng);
}
