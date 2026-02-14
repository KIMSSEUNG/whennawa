package com.whennawa.dto.chat;

import java.time.LocalDateTime;

public record ChatMessageResponse(
    Long companyId,
    String senderNickname,
    String message,
    LocalDateTime timestamp
) {}
