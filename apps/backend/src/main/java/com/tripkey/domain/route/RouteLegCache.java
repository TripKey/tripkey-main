package com.tripkey.domain.route;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "route_legs_cache")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RouteLegCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "origin_lat", nullable = false)
    private double originLat;

    @Column(name = "origin_lng", nullable = false)
    private double originLng;

    @Column(name = "dest_lat", nullable = false)
    private double destLat;

    @Column(name = "dest_lng", nullable = false)
    private double destLng;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "distance_meters", nullable = false)
    private int distanceMeters;

    @Column(name = "mode", nullable = false)
    private String mode;

    @Column(name = "source", nullable = false)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static RouteLegCache of(double originLat, double originLng, double destLat, double destLng,
                                   int durationSeconds, int distanceMeters, String mode, String source) {
        RouteLegCache c = new RouteLegCache();
        c.originLat = originLat;
        c.originLng = originLng;
        c.destLat = destLat;
        c.destLng = destLng;
        c.durationSeconds = durationSeconds;
        c.distanceMeters = distanceMeters;
        c.mode = mode;
        c.source = source;
        return c;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
