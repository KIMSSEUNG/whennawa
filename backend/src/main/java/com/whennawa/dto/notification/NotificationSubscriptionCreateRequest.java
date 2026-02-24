package com.whennawa.dto.notification;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NotificationSubscriptionCreateRequest {
    @NotBlank
    private String companyName;
}
