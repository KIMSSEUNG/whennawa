package com.whennawa.dto.chat;

import java.time.LocalDateTime;

public record ChatMessageResponse(
    Long companyId,
    Long senderUserId,
    String senderNickname,
    String message,
    LocalDateTime timestamp
) {}
