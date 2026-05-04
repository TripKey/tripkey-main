package com.tripkey.domain.place;

import com.tripkey.common.converter.StringListConverter;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.locationtech.jts.geom.Point;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "place_cards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceCard {

    private static final Set<String> CATEGORIES = Set.of(
            "place", "activity", "transport", "accommodation", "food", "etc"
    );
    private static final Set<String> CLASSIFICATIONS = Set.of(
            "confirmed", "open_question", "undecided", "unassigned"
    );
    private static final Set<String> PLACEMENT_STATUSES = Set.of(
            "ready", "ready_partial", "needs_input", "blocked"
    );
    private static final Set<String> NON_EXCLUDABLE_CATEGORIES = Set.of("transport", "accommodation");
    private static final Set<String> DUPLICATE_DEFAULT_CATEGORIES = Set.of("transport", "accommodation");

    @Id
    @Column(name = "instance_id", columnDefinition = "uuid")
    private UUID instanceId;

    @Column(name = "trip_id", nullable = false, columnDefinition = "uuid")
    private UUID tripId;

    @Column(name = "place_id", columnDefinition = "text")
    private String placeId;

    @Column(name = "name", nullable = false, columnDefinition = "text")
    private String name;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "classification", nullable = false)
    private String classification;

    @Column(name = "placement_status", nullable = false)
    private String placementStatus;

    @Column(name = "processing_status", nullable = false)
    private String processingStatus;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "can_exclude", nullable = false)
    private Boolean canExclude;

    @Column(name = "allow_duplicate", nullable = false)
    private Boolean allowDuplicate;

    @Column(name = "is_excluded", nullable = false)
    private Boolean isExcluded;

    @Column(name = "is_ai_generated", nullable = false)
    private Boolean isAiGenerated;

    @Column(name = "estimated_duration_min")
    private Short estimatedDurationMin;

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;

    @Column(name = "geom", insertable = false, updatable = false, columnDefinition = "geometry(Point,4326)")
    private Point geom;

    @Column(name = "location", columnDefinition = "text")
    private String location;

    @Column(name = "address", columnDefinition = "text")
    private String address;

    @Column(name = "time_constraint", columnDefinition = "text")
    private String timeConstraint;

    @Column(name = "user_context", columnDefinition = "text")
    private String userContext;

    @Column(name = "tips", columnDefinition = "text")
    private String tips;

    @Column(name = "question_text", columnDefinition = "text")
    private String questionText;

    @Column(name = "options", columnDefinition = "text")
    @Convert(converter = StringListConverter.class)
    private List<String> options;

    @Column(name = "blocked_reason", columnDefinition = "text")
    private String blockedReason;

    @Column(name = "tags", columnDefinition = "text")
    @Convert(converter = StringListConverter.class)
    private List<String> tags;

    @Column(name = "source")
    private String source;

    @Column(name = "day")
    private Integer day;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "memo", columnDefinition = "text")
    private String memo;

    @Column(name = "check_in")
    private String checkIn;

    @Column(name = "check_out")
    private String checkOut;

    @Column(name = "flight_number")
    private String flightNumber;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public static PlaceCard createUserCard(
            UUID tripId,
            String name,
            String category,
            String location,
            Short estimatedDurationMin,
            String timeConstraint,
            String memo,
            String checkIn,
            String checkOut,
            String flightNumber
    ) {
        PlaceCard card = new PlaceCard();
        card.tripId = tripId;
        card.name = defaultString(name, "이름 미정");
        card.category = normalizeCategory(category);
        card.classification = "confirmed";
        card.placementStatus = "ready";
        card.processingStatus = "processing";
        card.actionType = "review_only";
        card.canExclude = !NON_EXCLUDABLE_CATEGORIES.contains(card.category);
        card.allowDuplicate = DUPLICATE_DEFAULT_CATEGORIES.contains(card.category);
        card.isExcluded = false;
        card.isAiGenerated = false;
        card.estimatedDurationMin = estimatedDurationMin;
        card.location = trimToNull(location);
        card.timeConstraint = trimToNull(timeConstraint);
        card.memo = trimToNull(memo);
        card.checkIn = trimToNull(checkIn);
        card.checkOut = trimToNull(checkOut);
        card.flightNumber = trimToNull(flightNumber);
        card.source = "manual";
        return card;
    }

    public void changeClassification(String newClassification) {
        String normalized = normalizeClassification(newClassification);
        if (!"open_question".equals(this.classification) || !"confirmed".equals(normalized)) {
            throw new com.tripkey.common.exception.InvalidClassificationTransitionException(
                    this.classification, newClassification);
        }
        this.classification = "confirmed";
        recomputeActionType();
    }

    public void setExcluded(boolean excluded) {
        this.isExcluded = excluded;
    }

    public void setAllowDuplicate(boolean value) {
        this.allowDuplicate = value;
    }

    public void updateNotes(String notes) {
        this.notes = trimToNull(notes);
    }

    public void updateMemo(String memo) {
        this.memo = trimToNull(memo);
    }

    public void applyAccommodationEdit(String location, String checkIn, String checkOut) {
        if (location != null) {
            this.location = trimToNull(location);
        }
        if (checkIn != null) {
            this.checkIn = trimToNull(checkIn);
        }
        if (checkOut != null) {
            this.checkOut = trimToNull(checkOut);
        }
        markReprocessing();
    }

    public void applyTransportEdit(String location, String timeConstraint, String flightNumber) {
        if (location != null) {
            this.location = trimToNull(location);
        }
        if (timeConstraint != null) {
            this.timeConstraint = trimToNull(timeConstraint);
        }
        if (flightNumber != null) {
            this.flightNumber = trimToNull(flightNumber);
        }
        markReprocessing();
    }

    private void markReprocessing() {
        this.processingStatus = "processing";
        recomputeActionType();
    }

    private void recomputeActionType() {
        this.actionType = computeActionType(
                this.classification,
                this.placementStatus,
                this.processingStatus,
                this.options);
    }

    public static PlaceCard createFromAiResponse(UUID tripId, AiPlaceCardDto dto) {
        PlaceCard card = new PlaceCard();
        card.tripId = tripId;
        card.placeId = trimToNull(dto.placeId());
        card.name = defaultString(dto.name(), "이름 미정");
        card.category = normalizeCategory(dto.category());
        card.classification = normalizeClassification(dto.classification());
        card.placementStatus = normalizePlacementStatus(dto.placementStatus(), card.classification);
        card.processingStatus = "completed";
        card.isAiGenerated = dto.isAiGenerated() != null ? dto.isAiGenerated() : false;
        card.allowDuplicate = dto.allowDuplicate() != null
                ? dto.allowDuplicate()
                : DUPLICATE_DEFAULT_CATEGORIES.contains(card.category);
        card.canExclude = !NON_EXCLUDABLE_CATEGORIES.contains(card.category);
        card.isExcluded = false;
        card.actionType = computeActionType(card.classification, card.placementStatus, card.processingStatus, dto.options());

        card.estimatedDurationMin = dto.estimatedDurationMin();
        if (dto.coordinates() != null) {
            card.lat = dto.coordinates().lat();
            card.lng = dto.coordinates().lng();
        }
        card.location = trimToNull(dto.location());
        card.address = trimToNull(dto.address());
        card.timeConstraint = trimToNull(dto.timeConstraint());
        card.userContext = trimToNull(dto.userContext());
        card.tips = trimToNull(dto.tips());
        card.questionText = trimToNull(dto.questionText());
        card.options = dto.options();
        card.blockedReason = trimToNull(dto.blockedReason());
        card.tags = dto.tags();
        card.source = "ai_parse";
        card.checkIn = trimToNull(dto.checkIn());
        card.checkOut = trimToNull(dto.checkOut());
        card.flightNumber = trimToNull(dto.flightNumber());
        return card;
    }

    @PrePersist
    protected void onCreate() {
        if (this.instanceId == null) {
            this.instanceId = UUID.randomUUID();
        }
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    private static String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "etc";
        }
        String normalized = category.trim().toLowerCase(Locale.ROOT);
        if (CATEGORIES.contains(normalized)) {
            return normalized;
        }
        return switch (normalized) {
            case "관광", "tour", "attraction", "sightseeing", "landmark" -> "place";
            case "체험", "experience" -> "activity";
            case "쇼핑", "shopping", "mart", "market" -> "etc";
            case "식사", "dining", "restaurant", "cafe", "카페" -> "food";
            case "숙박", "stay", "lodging", "hotel" -> "accommodation";
            case "교통", "transportation", "transit", "flight" -> "transport";
            default -> "etc";
        };
    }

    private static String normalizeClassification(String classification) {
        if (classification == null || classification.isBlank()) {
            return "undecided";
        }
        String normalized = classification.trim().toLowerCase(Locale.ROOT);
        if (CLASSIFICATIONS.contains(normalized)) {
            return normalized;
        }
        return "undecided";
    }

    private static String normalizePlacementStatus(String placementStatus, String classification) {
        if (placementStatus != null && !placementStatus.isBlank()) {
            String normalized = placementStatus.trim().toLowerCase(Locale.ROOT);
            if (PLACEMENT_STATUSES.contains(normalized)) {
                return normalized;
            }
        }
        return switch (classification) {
            case "unassigned" -> "blocked";
            case "undecided" -> "needs_input";
            default -> "ready_partial";
        };
    }

    private static String computeActionType(String classification, String placementStatus, String processingStatus, List<String> options) {
        if ("failed".equals(processingStatus)) {
            return "fix_required";
        }
        if ("blocked".equals(placementStatus)) {
            return "fix_required";
        }
        if ("needs_input".equals(placementStatus)) {
            return "input_required";
        }
        if ("undecided".equals(classification) && options != null && !options.isEmpty()) {
            return "select_required";
        }
        return "review_only";
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
