package com.whennawa.controller;

import com.whennawa.dto.user.UserBlockItem;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.UserBlockService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users/blocks")
@RequiredArgsConstructor
public class UserBlockController {
    private final UserBlockService userBlockService;

    @GetMapping
    public List<UserBlockItem> list(Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return userBlockService.listBlockedUsers(principal.getUserId());
    }

    @PostMapping("/{targetUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void block(Authentication authentication, @PathVariable("targetUserId") Long targetUserId) {
        UserPrincipal principal = requirePrincipal(authentication);
        userBlockService.blockUser(principal.getUserId(), targetUserId);
    }

    @DeleteMapping("/{targetUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unblock(Authentication authentication, @PathVariable("targetUserId") Long targetUserId) {
        UserPrincipal principal = requirePrincipal(authentication);
        userBlockService.unblockUser(principal.getUserId(), targetUserId);
    }

    private UserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return principal;
    }
}
