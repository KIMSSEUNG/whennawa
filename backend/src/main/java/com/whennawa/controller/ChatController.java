package com.whennawa.controller;

import com.whennawa.config.WebSocketAuthHandshakeInterceptor;
import com.whennawa.dto.chat.ChatMessageRequest;
import com.whennawa.dto.chat.ChatMessageResponse;
import com.whennawa.service.ChatService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;

@Controller
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/message")
    public void sendMessage(@Valid ChatMessageRequest request,
                            @Header(name = "simpSessionAttributes", required = false) Map<String, Object> sessionAttributes) {
        Long userId = extractUserId(sessionAttributes);
        ChatMessageResponse response = chatService.processAndSave(request, userId);
        String destination = "/sub/chat/room/" + response.companyId();
        messagingTemplate.convertAndSend(destination, response);
    }

    private Long extractUserId(Map<String, Object> sessionAttributes) {
        if (sessionAttributes == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Object value = sessionAttributes.get(WebSocketAuthHandshakeInterceptor.USER_ID_ATTR);
        if (value instanceof Long userId) {
            return userId;
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
    }
}
