package com.tripkey.domain.place;

import com.tripkey.common.converter.StringListConverter;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "place_cards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceCard {

    @Id
    @Column(name = "instance_id", columnDefinition = "uuid")
    private UUID instanceId;

    @Column(name = "trip_id", nullable = false, columnDefinition = "uuid")
    private UUID tripId;

    @Column(name = "place_id", columnDefinition = "text")
    private String placeId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "name", nullable = false, columnDefinition = "text")
    private String name;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "classification", nullable = false)
    private String classification;

    @Column(name = "estimated_duration_min")
    private Short estimatedDurationMin;

    @Column(name = "time_constraint", columnDefinition = "text")
    private String timeConstraint;

    @Column(name = "is_ai_generated", nullable = false)
    private Boolean isAiGenerated;

    @Column(name = "conflict_type")
    private String conflictType;

    @Column(name = "conflict_reason", columnDefinition = "text")
    private String conflictReason;

    @Column(name = "remind", columnDefinition = "text")
    @Convert(converter = StringListConverter.class)
    private List<String> remind;

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public static PlaceCard createFromAiResponse(UUID tripId, AiPlaceCardDto dto) {
        PlaceCard card = new PlaceCard();
        card.tripId = tripId;
        card.placeId = dto.placeId();
        card.status = normalizeStatus(dto.status());
        card.name = defaultString(dto.name(), "이름 미정");
        card.category = defaultString(dto.category(), "미분류");
        card.classification = normalizeClassification(dto.classification());
        card.estimatedDurationMin = dto.estimatedDurationMin() != null ? dto.estimatedDurationMin() : (short) 60;
        card.timeConstraint = dto.timeConstraint();
        card.isAiGenerated = true;
        card.conflictType = dto.conflictType();
        card.conflictReason = dto.conflictReason();
        card.remind = dto.remind() != null ? dto.remind() : List.of();

        if (dto.coordinates() != null) {
            card.lat = dto.coordinates().lat();
            card.lng = dto.coordinates().lng();
        }

        return card;
    }

    @PrePersist
    protected void onCreate() {
        this.instanceId = UUID.randomUUID();
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    private static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "success";
        }

        return switch (status.toLowerCase()) {
            case "failure", "error" -> "error";
            case "loading" -> "loading";
            default -> "success";
        };
    }

    private static String normalizeClassification(String classification) {
        if (classification == null || classification.isBlank()) {
            return "undecided";
        }

        return switch (classification.toLowerCase()) {
            case "confirmed" -> "confirmed";
            case "open_question" -> "open_question";
            case "unassigned" -> "unassigned";
            case "undecided", "unconfirmed" -> "undecided";
            default -> "undecided";
        };
    }

    private static String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
