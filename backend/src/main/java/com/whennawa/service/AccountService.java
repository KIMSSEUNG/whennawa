package com.whennawa.service;

import com.whennawa.entity.User;
import com.whennawa.exception.NotFoundException;
import com.whennawa.repository.UserRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;

    public AccountService(UserRepository userRepository,
                          RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public void withdraw(Long userId) {
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new NotFoundException("User not found"));
        refreshTokenService.deleteAllTokensForUser(userId);
        user.markDeleted(LocalDateTime.now());
        userRepository.save(user);
    }
}

