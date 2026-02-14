package com.whennawa.service;

import com.whennawa.dto.GoogleUserInfoResponse;
import com.whennawa.entity.User;
import com.whennawa.repository.UserRepository;
import java.util.Objects;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@Service
public class OAuthAccountService {
    private final RestTemplate restTemplate;
    private final UserRepository userRepository;

    public OAuthAccountService(RestTemplate restTemplate, UserRepository userRepository) {
        this.restTemplate = restTemplate;
        this.userRepository = userRepository;
    }

    @Transactional
    public OAuthAccountResult handleOAuthSuccess(OAuth2AuthorizedClient client) {
        if (client == null || client.getAccessToken() == null) {
            throw new IllegalStateException("OAuth2 client or access token is missing");
        }
        String accessToken = client.getAccessToken().getTokenValue();
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("Access token is missing");
        }

        String googleEmail = fetchGoogleEmail(accessToken);
        if (googleEmail == null || googleEmail.isBlank()) {
            throw new IllegalStateException("Google email not returned");
        }

        User user = userRepository.findByEmail(googleEmail).orElse(null);
        if (user == null) {
            user = userRepository.save(new User(googleEmail));
        } else if (user.isDeleted()) {
            user.restore();
            user = userRepository.save(user);
        }

        return OAuthAccountResult.success(user);
    }

    private String fetchGoogleEmail(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<GoogleUserInfoResponse> response = restTemplate.exchange(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            HttpMethod.GET,
            entity,
            GoogleUserInfoResponse.class
        );
        GoogleUserInfoResponse body = response.getBody();
        return body == null ? null : body.getEmail();
    }

    public static class OAuthAccountResult {
        private final User user;

        private OAuthAccountResult(User user) {
            this.user = Objects.requireNonNull(user, "user");
        }

        public static OAuthAccountResult success(User user) {
            return new OAuthAccountResult(user);
        }

        public User getUser() {
            return user;
        }
    }
}

