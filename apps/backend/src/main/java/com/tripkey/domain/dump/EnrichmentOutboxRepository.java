package com.tripkey.domain.dump;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EnrichmentOutboxRepository extends JpaRepository<EnrichmentOutbox, Long> {

    /**
     * 발행 대기(due) 메시지를 created_at FIFO 로 FOR UPDATE SKIP LOCKED 점유.
     * 호출자(@Transactional)가 발행 후 markPublished/recordPublishFailure 하고 커밋해야 락 해제.
     */
    @Query(value = """
            select * from enrichment_outbox
             where status = 'pending' and next_attempt_at <= clock_timestamp()
             order by created_at asc
             for update skip locked
             limit :batchSize
            """, nativeQuery = true)
    List<EnrichmentOutbox> findPublishable(@Param("batchSize") int batchSize);
}
