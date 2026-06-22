package com.tripkey.domain.confirm;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ConfirmSummaryRepository extends JpaRepository<ConfirmSummary, UUID> {
}
