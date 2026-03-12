package com.whennawa.service;

import com.whennawa.dto.user.UserBlockItem;
import com.whennawa.entity.User;
import com.whennawa.entity.UserBlock;
import com.whennawa.repository.UserBlockRepository;
import com.whennawa.repository.UserRepository;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserBlockService {
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;

    @Transactional
    public void blockUser(Long blockerUserId, Long blockedUserId) {
        User blocker = resolveUser(blockerUserId);
        User blocked = resolveUser(blockedUserId);
        if (blocker.getId().equals(blocked.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot block yourself");
        }

        UserBlock block = userBlockRepository.findByBlocker_IdAndBlocked_Id(blocker.getId(), blocked.getId())
            .orElseGet(() -> {
                UserBlock created = new UserBlock();
                created.setBlocker(blocker);
                created.setBlocked(blocked);
                return created;
            });
        block.setActive(true);
        userBlockRepository.save(block);
    }

    @Transactional
    public void unblockUser(Long blockerUserId, Long blockedUserId) {
        UserBlock block = userBlockRepository.findByBlocker_IdAndBlocked_Id(blockerUserId, blockedUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Block not found"));
        block.setActive(false);
    }

    @Transactional(readOnly = true)
    public List<UserBlockItem> listBlockedUsers(Long blockerUserId) {
        return userBlockRepository.findByBlocker_IdAndIsActiveTrueOrderByBlockIdDesc(blockerUserId).stream()
            .map(UserBlock::getBlocked)
            .filter(user -> user != null && !user.isDeleted())
            .map(user -> new UserBlockItem(user.getId(), user.getEmail(), user.getNickname()))
            .toList();
    }

    @Transactional(readOnly = true)
    public Set<Long> findBlockedUserIds(Long blockerUserId) {
        if (blockerUserId == null) {
            return Set.of();
        }
        return userBlockRepository.findByBlocker_IdAndIsActiveTrueOrderByBlockIdDesc(blockerUserId).stream()
            .map(UserBlock::getBlocked)
            .filter(user -> user != null && user.getId() != null && !user.isDeleted())
            .map(User::getId)
            .collect(Collectors.toSet());
    }

    private User resolveUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
