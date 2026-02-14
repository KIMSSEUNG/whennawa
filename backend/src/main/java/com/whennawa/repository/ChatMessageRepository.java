package com.whennawa.repository;

import com.whennawa.entity.ChatMessage;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findTop100ByCompanyCompanyIdOrderByCreatedAtDesc(Long companyId);
    long deleteByCreatedAtBefore(LocalDateTime createdAt);
}
