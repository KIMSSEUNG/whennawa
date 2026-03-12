package com.whennawa.dto.user;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserBlockItem {
    private final Long userId;
    private final String email;
    private final String nickname;
}
