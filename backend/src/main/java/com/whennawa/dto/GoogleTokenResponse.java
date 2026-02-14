package com.whennawa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
public class GoogleTokenResponse {
    @JsonProperty("access_token")
    @Setter
    private String accessToken;

    @JsonProperty("refresh_token")
    @Setter
    private String refreshToken;

    @JsonProperty("expires_in")
    private Long expiresIn;

    @JsonProperty("token_type")
    private String tokenType;

    @JsonProperty("scope")
    private String scope;


}




