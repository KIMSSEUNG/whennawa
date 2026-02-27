package com.whennawa.config;

import com.whennawa.service.AuthCookieService;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class OAuth2FailureHandler implements AuthenticationFailureHandler {
    private static final Logger log = LoggerFactory.getLogger(OAuth2FailureHandler.class);
    private final AuthCookieService authCookieService;

    public OAuth2FailureHandler(AuthCookieService authCookieService) {
        this.authCookieService = authCookieService;
    }

    @Value("${app.frontend.base-url}")
    private String redirectURL;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {
        String reason = "oauth_failed";
        if (exception instanceof OAuth2AuthenticationException) {
            OAuth2AuthenticationException oauthEx = (OAuth2AuthenticationException) exception;
            String errorCode = oauthEx.getError().getErrorCode();
            if ("access_denied".equals(errorCode)) {
                reason = "consent_denied";
            }
        }
        String nextPath = sanitizeNext(authCookieService.resolveLoginNext(request));
        authCookieService.clearLoginNextCookie(response);
        log.info("OAuth2 login failed: {}", reason, exception);
        response.sendRedirect(buildLoginRedirect(reason, nextPath));
    }

    private String sanitizeNext(String nextPath) {
        if (nextPath == null || nextPath.isBlank()) {
            return "/";
        }
        String trimmed = nextPath.trim();
        if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
            return "/";
        }
        return trimmed;
    }

    private String buildLoginRedirect(String reason, String nextPath) {
        String base = redirectURL.endsWith("/") ? redirectURL : redirectURL + "/";
        return base + "login?reason=" + reason + "&next=" + java.net.URLEncoder.encode(nextPath, java.nio.charset.StandardCharsets.UTF_8);
    }
}

