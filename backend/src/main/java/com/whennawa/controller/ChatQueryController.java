package com.whennawa.controller;

import com.whennawa.dto.chat.ChatMessageResponse;
import com.whennawa.service.ChatService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatQueryController {
    private final ChatService chatService;

    @GetMapping("/room/{companyId}/messages")
    public List<ChatMessageResponse> messages(@PathVariable("companyId") Long companyId,
                                              @RequestParam(value = "limit", defaultValue = "200") int limit) {
        return chatService.listRecentMessages(companyId, limit);
    }
}
