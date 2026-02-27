package com.whennawa.repository;

import com.whennawa.entity.ChatMessage;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByCompanyCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);
    long deleteByCreatedAtBefore(LocalDateTime createdAt);
}
