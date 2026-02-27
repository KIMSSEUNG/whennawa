package com.whennawa.controller;

import com.whennawa.dto.chat.ChatJoinResponse;
import com.whennawa.dto.chat.ChatMessageResponse;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.ChatService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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

    @PostMapping("/room/{companyId}/join")
    public ChatJoinResponse join(Authentication authentication,
                                 @PathVariable("companyId") Long companyId) {
        UserPrincipal principal = requirePrincipal(authentication);
        String nickname = chatService.joinRoom(companyId, principal.getUserId());
        return new ChatJoinResponse(nickname);
    }

    private UserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return principal;
    }
}
