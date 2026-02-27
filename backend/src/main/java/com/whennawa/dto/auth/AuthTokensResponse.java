package com.whennawa.dto.auth;

public class AuthTokensResponse {
    private String accessToken;

    public AuthTokensResponse() {
    }

    public AuthTokensResponse(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }
}

