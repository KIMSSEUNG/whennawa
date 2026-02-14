package com.whennawa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
public class GoogleUserInfoResponse {
    @JsonProperty("email")
    @Setter
    private String email;

}




