package com.tripkey.domain.confirm;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ConfirmSummaryTest {

    @Test
    void createRuleBasedInitializesCompletedSnapshot() {
        UUID tripId = UUID.randomUUID();

        ConfirmSummary summary = ConfirmSummary.createRuleBased(tripId, "{\"days\":[]}");

        assertThat(summary.getTripId()).isEqualTo(tripId);
        assertThat(summary.getStatus()).isEqualTo("completed");
        assertThat(summary.getGenerationMode()).isEqualTo("rule_based");
        assertThat(summary.getSummaryJson()).isEqualTo("{\"days\":[]}");
        assertThat(summary.getGeneratedAt()).isNotNull();
    }

    @Test
    void replaceRuleBasedSnapshotOverwritesPayloadAndMetadata() {
        ConfirmSummary summary = ConfirmSummary.createRuleBased(UUID.randomUUID(), "{\"days\":[]}");

        summary.replaceRuleBasedSnapshot("{\"trip_checklist\":[]}");

        assertThat(summary.getStatus()).isEqualTo("completed");
        assertThat(summary.getGenerationMode()).isEqualTo("rule_based");
        assertThat(summary.getSummaryJson()).isEqualTo("{\"trip_checklist\":[]}");
        assertThat(summary.getGeneratedAt()).isNotNull();
    }
}
