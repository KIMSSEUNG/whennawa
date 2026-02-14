package com.whennawa.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatMessageRequest {
    @NotNull
    private Long companyId;

    @NotBlank
    private String message;
}
