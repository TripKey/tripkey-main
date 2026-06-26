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
import java.util.Objects;
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
    // 좌표 확보를 위해 Places 재처리가 필요한 카테고리. transport/etc 는 좌표가 필요 없다.
    private static final Set<String> PLACES_ENRICHMENT_CATEGORIES = Set.of(
            "place", "activity", "accommodation", "food"
    );

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

    @Column(name = "pending_reorder", nullable = false)
    private Boolean pendingReorder;

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

    @Column(name = "day_order")
    private Short dayOrder;

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

    @Column(name = "flight_datetime")
    private String flightDatetime;

    @Column(name = "flight_role")
    private String flightRole;

    @Column(name = "departure_airport")
    private String departureAirport;

    @Column(name = "arrival_airport")
    private String arrivalAirport;

    @Column(name = "search_alias", columnDefinition = "text")
    private String searchAlias;

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
        card.placementStatus = "ready_partial";
        card.processingStatus = "processing";
        card.actionType = "review_only";
        card.canExclude = !NON_EXCLUDABLE_CATEGORIES.contains(card.category);
        card.allowDuplicate = DUPLICATE_DEFAULT_CATEGORIES.contains(card.category);
        card.isExcluded = false;
        card.isAiGenerated = false;
        card.pendingReorder = true;
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

    /**
     * 덤프 제출 시 구조화 입력으로 받은 항공편을 그대로 transport 카드로 영속한다.
     * AI 받아적기에 의존하지 않고 입력값(편명/시간/공항/방향)을 결정론적으로 보존한다.
     * 좌표가 필요 없는 교통 카드이므로 enrichment 대상에서 제외된다(processingStatus=completed).
     */
    public static PlaceCard createFlightCard(
            UUID tripId,
            String flightNumber,
            String flightDatetime,
            String flightRole,
            String departureAirport,
            String arrivalAirport
    ) {
        PlaceCard card = new PlaceCard();
        card.tripId = tripId;
        card.flightNumber = trimToNull(flightNumber);
        card.flightDatetime = normalizeFlightDatetime(flightDatetime);
        card.flightRole = normalizeFlightRole(flightRole);
        card.departureAirport = trimToNull(departureAirport);
        card.arrivalAirport = trimToNull(arrivalAirport);
        card.name = buildFlightName(card.flightNumber, card.departureAirport, card.arrivalAirport, card.flightRole);
        card.category = "transport";
        card.classification = "confirmed";
        card.placementStatus = "ready_partial";
        card.processingStatus = "completed";
        card.actionType = computeActionType(card.classification, card.placementStatus);
        card.canExclude = false;
        card.allowDuplicate = true;
        card.isExcluded = false;
        card.isAiGenerated = false;
        card.pendingReorder = false;
        card.source = "user_input";
        return card;
    }

    /**
     * 덤프 제출 시 구조화 입력으로 받은 숙소를 그대로 accommodation 카드로 영속한다.
     * 체크인/체크아웃/이름/위치를 결정론적으로 보존한다. 좌표 확보를 위해 enrichment 대상이며,
     * enrichment 는 AI 가 null 을 주면 기존 값을 보존하므로 입력한 체크인/아웃이 덮어써지지 않는다.
     */
    public static PlaceCard createAccommodationCard(
            UUID tripId,
            String name,
            String location,
            String checkIn,
            String checkOut
    ) {
        PlaceCard card = new PlaceCard();
        card.tripId = tripId;
        card.name = defaultString(name, "숙소");
        card.location = trimToNull(location);
        card.checkIn = trimToNull(checkIn);
        card.checkOut = trimToNull(checkOut);
        card.category = "accommodation";
        card.classification = "confirmed";
        card.placementStatus = "ready_partial";
        card.processingStatus = "pending";
        card.actionType = computeActionType(card.classification, card.placementStatus);
        card.canExclude = false;
        card.allowDuplicate = true;
        card.isExcluded = false;
        card.isAiGenerated = false;
        card.pendingReorder = false;
        card.source = "user_input";
        return card;
    }

    private static String buildFlightName(
            String flightNumber, String departureAirport, String arrivalAirport, String flightRole) {
        if (departureAirport != null && arrivalAirport != null) {
            return departureAirport + " → " + arrivalAirport;
        }
        String label = "inbound".equals(flightRole) ? "귀국편" : "출발편";
        if (flightNumber != null) {
            return flightNumber + " " + label;
        }
        if (departureAirport != null) {
            return departureAirport + " " + label;
        }
        if (arrivalAirport != null) {
            return arrivalAirport + " " + label;
        }
        return label;
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

    /** 좌표 확보를 위해 Places 재처리(lookup)가 필요한 카테고리인지. transport/etc 는 좌표 불필요. */
    public boolean requiresPlacesEnrichment() {
        return PLACES_ENRICHMENT_CATEGORIES.contains(this.category);
    }

    public void applyDayPlacement(int day, int order, Short estimatedDurationMin) {
        this.day = day;
        this.dayOrder = (short) order;
        if (estimatedDurationMin != null) {
            this.estimatedDurationMin = estimatedDurationMin;
        }
    }

    public void clearDayPlacement() {
        this.day = null;
        this.dayOrder = null;
    }

    /**
     * 숙소 구조화 편집. 위치(좌표에 영향)가 실제로 바뀐 경우에만 true 를 반환해
     * 호출부가 재처리(Places lookup) 트리거 여부를 결정한다. 체크인/체크아웃만 바뀌면
     * 값만 저장하고 재처리하지 않는다(불필요한 processing 강등 방지).
     */
    public boolean applyAccommodationEdit(String location, String checkIn, String checkOut) {
        boolean locationChanged = false;
        if (location != null) {
            String normalized = trimToNull(location);
            locationChanged = !Objects.equals(normalized, this.location);
            this.location = normalized;
        }
        if (checkIn != null) {
            this.checkIn = trimToNull(checkIn);
        }
        if (checkOut != null) {
            this.checkOut = trimToNull(checkOut);
        }
        return locationChanged;
    }

    /**
     * 교통(항공 포함) 구조화 편집. 위치(공항)가 실제로 바뀐 경우에만 true 를 반환한다.
     * 시간(time_constraint)·편명만 바뀌면 값만 저장한다. 항공 시각의 flight_datetime 정규화는
     * 위치 변경으로 재처리가 트리거될 때 AI 파싱 결과로 반영된다.
     */
    public boolean applyTransportEdit(String location, String timeConstraint, String flightNumber) {
        boolean locationChanged = false;
        if (location != null) {
            String normalized = trimToNull(location);
            locationChanged = !Objects.equals(normalized, this.location);
            this.location = normalized;
        }
        if (timeConstraint != null) {
            this.timeConstraint = trimToNull(timeConstraint);
        }
        if (flightNumber != null) {
            this.flightNumber = trimToNull(flightNumber);
        }
        return locationChanged;
    }

    public boolean canStartNaturalLanguageParsingFromNotes() {
        return ("undecided".equals(this.classification)
                && ("needs_input".equals(this.placementStatus) || "ready_partial".equals(this.placementStatus)))
                || ("failed".equals(this.processingStatus) && !"open_question".equals(this.classification));
    }

    public void markCardLevelParsingStarted() {
        this.processingStatus = "processing";
        recomputeActionType();
    }

    public void applyCardLevelParseResult(AiPlaceCardDto dto) {
        this.placeId = trimToNull(dto.placeId());
        if (dto.coordinates() != null) {
            this.lat = dto.coordinates().lat();
            this.lng = dto.coordinates().lng();
        } else {
            this.lat = null;
            this.lng = null;
        }
        this.address = trimToNull(dto.address());

        this.name = defaultString(dto.name(), this.name);
        this.category = normalizeCategory(dto.category() != null ? dto.category() : this.category);
        this.classification = "confirmed";
        this.placementStatus = "ready_partial";
        this.processingStatus = "completed";
        this.actionType = computeActionType(this.classification, this.placementStatus);
        this.canExclude = !NON_EXCLUDABLE_CATEGORIES.contains(this.category);
        this.allowDuplicate = dto.allowDuplicate() != null
                ? dto.allowDuplicate()
                : DUPLICATE_DEFAULT_CATEGORIES.contains(this.category);
        this.isAiGenerated = dto.isAiGenerated() != null ? dto.isAiGenerated() : this.isAiGenerated;

        this.estimatedDurationMin = dto.estimatedDurationMin() != null
                ? dto.estimatedDurationMin()
                : this.estimatedDurationMin;
        this.location = dto.location() != null ? trimToNull(dto.location()) : this.location;
        this.timeConstraint = dto.timeConstraint() != null ? trimToNull(dto.timeConstraint()) : this.timeConstraint;
        this.userContext = trimToNull(dto.userContext());
        this.tips = trimToNull(dto.tips());
        this.searchAlias = trimToNull(dto.searchAlias());
        this.questionText = null;
        this.options = null;
        this.blockedReason = null;
        this.tags = dto.tags();
        this.checkIn = dto.checkIn() != null ? trimToNull(dto.checkIn()) : this.checkIn;
        this.checkOut = dto.checkOut() != null ? trimToNull(dto.checkOut()) : this.checkOut;
        this.flightNumber = dto.flightNumber() != null ? trimToNull(dto.flightNumber()) : this.flightNumber;
        this.flightDatetime = dto.flightDatetime() != null
                ? normalizeFlightDatetime(dto.flightDatetime())
                : this.flightDatetime;
        this.flightRole = dto.flightRole() != null ? normalizeFlightRole(dto.flightRole()) : this.flightRole;

        demoteWhenCoordinatesMissing();
    }

    public void applyCardLevelQuestionResult(AiPlaceCardDto dto) {
        this.placeId = null;
        this.lat = null;
        this.lng = null;
        this.address = null;

        this.name = defaultString(dto.name(), this.name);
        this.category = normalizeCategory(dto.category() != null ? dto.category() : this.category);
        this.classification = normalizeClassification(dto.classification());
        this.placementStatus = normalizePlacementStatus(dto.placementStatus(), this.classification);
        this.processingStatus = "completed";
        this.actionType = computeActionType(this.classification, this.placementStatus);
        this.canExclude = !NON_EXCLUDABLE_CATEGORIES.contains(this.category);
        this.allowDuplicate = dto.allowDuplicate() != null
                ? dto.allowDuplicate()
                : DUPLICATE_DEFAULT_CATEGORIES.contains(this.category);
        this.isAiGenerated = dto.isAiGenerated() != null ? dto.isAiGenerated() : this.isAiGenerated;

        this.estimatedDurationMin = dto.estimatedDurationMin() != null
                ? dto.estimatedDurationMin()
                : this.estimatedDurationMin;
        this.location = dto.location() != null ? trimToNull(dto.location()) : this.location;
        this.timeConstraint = dto.timeConstraint() != null ? trimToNull(dto.timeConstraint()) : this.timeConstraint;
        this.userContext = trimToNull(dto.userContext());
        this.tips = trimToNull(dto.tips());
        this.searchAlias = trimToNull(dto.searchAlias());
        this.questionText = trimToNull(dto.questionText());
        this.options = dto.options();
        this.blockedReason = trimToNull(dto.blockedReason());
        this.tags = dto.tags();
        this.checkIn = dto.checkIn() != null ? trimToNull(dto.checkIn()) : this.checkIn;
        this.checkOut = dto.checkOut() != null ? trimToNull(dto.checkOut()) : this.checkOut;
        this.flightNumber = dto.flightNumber() != null ? trimToNull(dto.flightNumber()) : this.flightNumber;
        this.flightDatetime = dto.flightDatetime() != null
                ? normalizeFlightDatetime(dto.flightDatetime())
                : this.flightDatetime;
        this.flightRole = dto.flightRole() != null ? normalizeFlightRole(dto.flightRole()) : this.flightRole;
    }

    public boolean isConfirmedParseResult(AiPlaceCardDto dto) {
        return "confirmed".equals(normalizeClassification(dto.classification()));
    }

    public boolean isQuestionParseResult(AiPlaceCardDto dto) {
        return "undecided".equals(normalizeClassification(dto.classification()));
    }

    public void markProcessingCompleted() {
        this.processingStatus = "completed";
        recomputeActionType();
    }

    public void markProcessingFailed() {
        this.processingStatus = "failed";
        recomputeActionType();
    }

    public void markProcessing() {
        this.processingStatus = "processing";
        recomputeActionType();
    }

    public void completeEnrichment() {
        this.processingStatus = "completed";
        recomputeActionType();
    }

    public void markFailed() {
        this.processingStatus = "failed";
        recomputeActionType();
    }

    private void recomputeActionType() {
        this.actionType = computeActionType(this.classification, this.placementStatus);
    }

    /**
     * AI 파싱 결과에 좌표가 없으면 사용자가 직접 풀 수 있도록 입력 필요 상태로 강등한다.
     * confirmed 카드만 대상이며(질문/blocked 카드는 보존), transport(항공편 등)는 좌표가 없어도 정상이라 면제한다.
     * 강등 후 undecided + needs_input 이 되어 notes 재파싱(self-heal) 경로가 열린다.
     */
    private void demoteWhenCoordinatesMissing() {
        if (!"confirmed".equals(this.classification)) {
            return;
        }
        if ("transport".equals(this.category)) {
            return;
        }
        if (this.lat != null && this.lng != null) {
            return;
        }
        this.classification = "undecided";
        this.placementStatus = "needs_input";
        recomputeActionType();
    }

    public static PlaceCard createFromAiResponse(UUID tripId, AiPlaceCardDto dto, String source) {
        PlaceCard card = new PlaceCard();
        card.tripId = tripId;
        card.placeId = trimToNull(dto.placeId());
        card.name = defaultString(dto.name(), "이름 미정");
        card.category = normalizeCategory(dto.category());
        card.classification = normalizeClassification(dto.classification());
        card.placementStatus = normalizePlacementStatus(dto.placementStatus(), card.classification);
        card.processingStatus = "pending";
        card.isAiGenerated = dto.isAiGenerated() != null ? dto.isAiGenerated() : false;
        card.allowDuplicate = dto.allowDuplicate() != null
                ? dto.allowDuplicate()
                : DUPLICATE_DEFAULT_CATEGORIES.contains(card.category);
        card.canExclude = !NON_EXCLUDABLE_CATEGORIES.contains(card.category);
        card.isExcluded = false;
        card.source = source;
        card.pendingReorder = "ai_recommend".equals(source);
        card.actionType = computeActionType(card.classification, card.placementStatus);

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
        card.checkIn = trimToNull(dto.checkIn());
        card.checkOut = trimToNull(dto.checkOut());
        card.flightNumber = trimToNull(dto.flightNumber());
        card.flightDatetime = normalizeFlightDatetime(dto.flightDatetime());
        card.flightRole = normalizeFlightRole(dto.flightRole());
        card.searchAlias = trimToNull(dto.searchAlias());

        card.demoteWhenCoordinatesMissing();
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

    private static String computeActionType(String classification, String placementStatus) {
        return switch (classification) {
            case "confirmed", "open_question" -> "review_only";
            case "undecided" -> switch (placementStatus) {
                case "ready_partial" -> "select_required";
                case "needs_input" -> "input_required";
                default -> "review_only";
            };
            case "unassigned" -> "blocked".equals(placementStatus) ? "fix_required" : "review_only";
            default -> "review_only";
        };
    }

    private static String normalizeFlightRole(String flightRole) {
        if (flightRole == null || flightRole.isBlank()) {
            return null;
        }
        String normalized = flightRole.trim().toLowerCase(Locale.ROOT);
        if ("outbound".equals(normalized) || "inbound".equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private static String normalizeFlightDatetime(String flightDatetime) {
        String normalized = trimToNull(flightDatetime);
        if (normalized == null) {
            return null;
        }
        try {
            OffsetDateTime.parse(normalized);
            return normalized;
        } catch (java.time.format.DateTimeParseException e) {
            return null;
        }
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
