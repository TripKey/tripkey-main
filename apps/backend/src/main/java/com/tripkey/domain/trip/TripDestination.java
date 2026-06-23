package com.tripkey.domain.trip;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trip_destinations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripDestination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private Short sortOrder;

    public TripDestination(Trip trip, String name, Short sortOrder) {
        this.trip = trip;
        this.name = name;
        this.sortOrder = sortOrder;
    }
}
