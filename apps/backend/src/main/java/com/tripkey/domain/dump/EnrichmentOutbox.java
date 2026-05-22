package com.tripkey.domain.dump;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "enrichment_outbox")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EnrichmentOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false, columnDefinition = "uuid")
    private UUID tripId;

    @Column(name = "instance_id", nullable = false, columnDefinition = "uuid")
    private UUID instanceId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "attempts", nullable = false)
    private Integer attempts = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "next_attempt_at", nullable = false)
    private OffsetDateTime nextAttemptAt;

    public static EnrichmentOutbox create(UUID tripId, UUID instanceId, String payload) {
        EnrichmentOutbox o = new EnrichmentOutbox();
        o.tripId = tripId;
        o.instanceId = instanceId;
        o.payload = payload;
        o.status = "pending";
        o.attempts = 0;
        return o;
    }

    public void markPublished(OffsetDateTime at) {
        this.status = "published";
        this.publishedAt = at;
    }

    /** 발행 실패: attempts++, max 미만이면 backoff 후 pending 유지, 이상이면 failed. */
    public void recordPublishFailure(OffsetDateTime nextAttempt, int maxAttempts) {
        this.attempts = (this.attempts == null ? 0 : this.attempts) + 1;
        if (this.attempts >= maxAttempts) {
            this.status = "failed";
        } else {
            this.nextAttemptAt = nextAttempt;
        }
    }

    /** 테스트 보조: next_attempt_at/attempts 직접 세팅. */
    public void backoff(OffsetDateTime nextAttempt, int attempts) {
        this.nextAttemptAt = nextAttempt;
        this.attempts = attempts;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        if (this.nextAttemptAt == null) {
            this.nextAttemptAt = now;
        }
    }
}
