package com.tripkey.domain.alert;

import com.tripkey.common.converter.StringListConverter;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "alert_cards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AlertCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false, columnDefinition = "uuid")
    private UUID tripId;

    @Column(name = "job_id", columnDefinition = "uuid")
    private UUID jobId;

    @Column(name = "alert_id", nullable = false, columnDefinition = "text")
    private String alertId;

    @Column(name = "type", nullable = false, columnDefinition = "text")
    private String type;

    @Column(name = "category", nullable = false, columnDefinition = "text")
    private String category;

    @Column(name = "scope", nullable = false, columnDefinition = "text")
    private String scope;

    @Column(name = "day")
    private Short day;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;

    @Column(name = "related_instance_ids", columnDefinition = "text")
    @Convert(converter = StringListConverter.class)
    private List<String> relatedInstanceIds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static AlertCard fromAiResponse(AiParseResponse.AlertCard src, UUID tripId, UUID jobId) {
        AlertCard card = new AlertCard();
        card.tripId = tripId;
        card.jobId = jobId;
        card.alertId = src.id();
        card.type = src.type();
        card.category = src.category();
        card.scope = src.scope() == null ? "trip" : src.scope();
        card.day = src.day() == null ? null : src.day().shortValue();
        card.message = src.message();
        card.relatedInstanceIds = src.relatedInstanceIds() == null
                ? null
                : src.relatedInstanceIds().stream().map(UUID::toString).toList();
        return card;
    }

    public List<UUID> relatedInstanceUuids() {
        if (relatedInstanceIds == null || relatedInstanceIds.isEmpty()) {
            return List.of();
        }
        return relatedInstanceIds.stream().map(UUID::fromString).toList();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
