package com.tripkey.domain.trip;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "trips")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Trip {

    @Id
    @Column(name = "trip_id", columnDefinition = "uuid")
    private UUID tripId;

    @Column(name = "travel_days", nullable = false)
    private Short travelDays;

    @Column(name = "companion_count", nullable = false)
    private Short companionCount;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    public Trip(Short travelDays, Short companionCount, LocalDate startDate) {
        this.travelDays = travelDays;
        this.companionCount = companionCount;
        this.startDate = startDate;
    }

    public Trip(Short travelDays, Short companionCount) {
        this(travelDays, companionCount, null);
    }

    public void confirm() {
        this.confirmedAt = OffsetDateTime.now();
    }

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.tripId = UUID.randomUUID();
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
