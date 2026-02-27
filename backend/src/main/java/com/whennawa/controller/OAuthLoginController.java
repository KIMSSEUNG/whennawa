package com.whennawa.controller;

import com.whennawa.service.AuthCookieService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class OAuthLoginController {
    private final AuthCookieService authCookieService;

    public OAuthLoginController(AuthCookieService authCookieService) {
        this.authCookieService = authCookieService;
    }

    @GetMapping("/auth/login/google")
    public String googleLogin(@RequestParam(value = "next", required = false) String next,
                              @RequestParam(value = "force_consent", required = false) String forceConsent,
                              HttpServletResponse response) {
        String safeNext = sanitizeNext(next);
        authCookieService.setLoginNextCookie(response, safeNext);
        String consent = "1".equals(forceConsent) ? "&force_consent=1" : "";
        return "redirect:/oauth2/authorization/google?source=login" + consent;
    }

    private String sanitizeNext(String next) {
        if (next == null || next.isBlank()) {
            return "/";
        }
        String trimmed = next.trim();
        if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
            return "/";
        }
        return trimmed;
    }
}
