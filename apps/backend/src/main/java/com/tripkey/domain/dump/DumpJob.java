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
@Table(name = "dump_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DumpJob {

    @Id
    @Column(name = "job_id", columnDefinition = "uuid")
    private UUID jobId;

    @Column(name = "trip_id", nullable = false, columnDefinition = "uuid")
    private UUID tripId;

    @Column(name = "dump_text", nullable = false, columnDefinition = "text")
    private String dumpText;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "step")
    private Short step;

    @Column(name = "error_code")
    private String errorCode;

    @Column(name = "context_summary", columnDefinition = "text")
    private String contextSummary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "departure_flight", columnDefinition = "jsonb")
    private String departureFlight;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "return_flight", columnDefinition = "jsonb")
    private String returnFlight;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "accommodation_inputs", columnDefinition = "jsonb")
    private String accommodationInputs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public static DumpJob create(UUID tripId, String dumpText) {
        return create(tripId, dumpText, null, null, null);
    }

    public static DumpJob create(UUID tripId, String dumpText,
                                 String departureFlight, String returnFlight) {
        return create(tripId, dumpText, departureFlight, returnFlight, null);
    }

    public static DumpJob create(UUID tripId, String dumpText,
                                 String departureFlight, String returnFlight,
                                 String accommodationInputs) {
        DumpJob job = new DumpJob();
        job.jobId = UUID.randomUUID();
        job.tripId = tripId;
        job.dumpText = dumpText;
        job.departureFlight = departureFlight;
        job.returnFlight = returnFlight;
        job.accommodationInputs = accommodationInputs;
        job.status = "pending";
        job.step = null;
        return job;
    }

    public void updateStatus(String status) {
        this.status = status;
    }

    public void updateStep(Short step) {
        this.step = step;
    }

    public void markProcessing(Short step) {
        this.status = "processing";
        this.step = step;
        this.errorCode = null;
    }

    public void fail(String errorCode) {
        this.status = "failed";
        this.errorCode = errorCode;
    }

    public void complete(String contextSummary) {
        this.status = "completed";
        this.step = 3;
        this.errorCode = null;
        this.contextSummary = contextSummary;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
