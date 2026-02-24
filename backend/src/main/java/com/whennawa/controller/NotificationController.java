package com.whennawa.controller;

import com.whennawa.dto.notification.NotificationPageResponse;
import com.whennawa.dto.notification.NotificationSubscriptionCreateRequest;
import com.whennawa.dto.notification.NotificationSubscriptionResponse;
import com.whennawa.dto.notification.UserNotificationResponse;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping("/subscriptions")
    public NotificationPageResponse<NotificationSubscriptionResponse> listSubscriptions(
        @RequestParam(value = "page", defaultValue = "0") Integer page,
        @RequestParam(value = "size", defaultValue = "20") Integer size,
        Authentication authentication
    ) {
        UserPrincipal principal = requirePrincipal(authentication);
        return notificationService.listSubscriptions(principal.getUserId(), page, size);
    }

    @PostMapping("/subscriptions")
    @ResponseStatus(HttpStatus.CREATED)
    public NotificationSubscriptionResponse subscribe(@Valid @RequestBody NotificationSubscriptionCreateRequest request,
                                                      Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return notificationService.subscribe(principal.getUserId(), request.getCompanyName());
    }

    @DeleteMapping("/subscriptions/{subscriptionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(@PathVariable("subscriptionId") Long subscriptionId,
                            Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        notificationService.unsubscribe(principal.getUserId(), subscriptionId);
    }

    @GetMapping
    public NotificationPageResponse<UserNotificationResponse> listInbox(
        @RequestParam(value = "page", defaultValue = "0") Integer page,
        @RequestParam(value = "size", defaultValue = "20") Integer size,
        Authentication authentication
    ) {
        UserPrincipal principal = requirePrincipal(authentication);
        return notificationService.listInbox(principal.getUserId(), page, size);
    }

    @DeleteMapping("/{notificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNotification(@PathVariable("notificationId") Long notificationId,
                                   Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        notificationService.deleteNotification(principal.getUserId(), notificationId);
    }

    private UserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return principal;
    }
}
