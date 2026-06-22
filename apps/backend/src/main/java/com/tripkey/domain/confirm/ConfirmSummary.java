package com.tripkey.domain.confirm;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "confirm_summaries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConfirmSummary {

    public static final String STATUS_COMPLETED = "completed";
    public static final String GENERATION_MODE_RULE_BASED = "rule_based";

    @Id
    @Column(name = "trip_id", columnDefinition = "uuid")
    private UUID tripId;

    @Column(name = "status", nullable = false, columnDefinition = "text")
    private String status;

    @Column(name = "generation_mode", nullable = false, columnDefinition = "text")
    private String generationMode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "summary_json", nullable = false, columnDefinition = "jsonb")
    private String summaryJson;

    @Column(name = "generated_at")
    private OffsetDateTime generatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public static ConfirmSummary createRuleBased(UUID tripId, String summaryJson) {
        ConfirmSummary summary = new ConfirmSummary();
        summary.tripId = tripId;
        summary.status = STATUS_COMPLETED;
        summary.generationMode = GENERATION_MODE_RULE_BASED;
        summary.summaryJson = summaryJson;
        summary.generatedAt = OffsetDateTime.now();
        return summary;
    }

    public void replaceRuleBasedSnapshot(String summaryJson) {
        this.status = STATUS_COMPLETED;
        this.generationMode = GENERATION_MODE_RULE_BASED;
        this.summaryJson = summaryJson;
        this.generatedAt = OffsetDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
