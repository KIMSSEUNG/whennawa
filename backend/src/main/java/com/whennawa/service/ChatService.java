package com.whennawa.service;

import com.whennawa.config.AppProperties;
import com.whennawa.dto.chat.ChatMessageRequest;
import com.whennawa.dto.chat.ChatMessageResponse;
import com.whennawa.entity.ChatMessage;
import com.whennawa.entity.ChatRoomMember;
import com.whennawa.entity.Company;
import com.whennawa.entity.User;
import com.whennawa.repository.ChatMessageRepository;
import com.whennawa.repository.ChatRoomMemberRepository;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.UserRepository;
import com.whennawa.util.NicknameGenerator;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final AppProperties appProperties;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final NicknameGenerator nicknameGenerator;
    private final ProfanityMasker profanityMasker;
    private final ConcurrentMap<Long, Long> lastChatAtByUserId = new ConcurrentHashMap<>();

    @Transactional
    public ChatMessageResponse processAndSave(ChatMessageRequest request, Long userId) {
        if (request == null || request.getCompanyId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid request");
        }
        enforceChatCooldown(userId);
        String messageText = normalizeMessage(request.getMessage());
        Company company = companyRepository.findById(request.getCompanyId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated"));

        ChatRoomMember member = findOrCreateMember(company, user);

        ChatMessage message = new ChatMessage();
        message.setCompany(company);
        message.setMember(member);
        message.setSenderNickname(member.getNickname());
        message.setMessage(profanityMasker.mask(messageText));
        ChatMessage saved = chatMessageRepository.save(message);

        return new ChatMessageResponse(
            company.getCompanyId(),
            saved.getSenderNickname(),
            saved.getMessage(),
            saved.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> listRecentMessages(Long companyId, int limit) {
        int maxFetch = Math.max(1, appProperties.getChat().getRecentFetchMax());
        int boundedLimit = Math.max(1, Math.min(limit, maxFetch));
        List<ChatMessage> recent = chatMessageRepository.findByCompanyCompanyIdOrderByCreatedAtDesc(
            companyId,
            PageRequest.of(0, maxFetch)
        );
        return recent.stream()
            .limit(boundedLimit)
            .sorted(Comparator.comparing(ChatMessage::getCreatedAt))
            .map(m -> new ChatMessageResponse(
                m.getCompany().getCompanyId(),
                m.getSenderNickname(),
                profanityMasker.mask(m.getMessage()),
                m.getCreatedAt()
            ))
            .toList();
    }

    private ChatRoomMember findOrCreateMember(Company company, User user) {
        return chatRoomMemberRepository.findByCompanyCompanyIdAndUserId(company.getCompanyId(), user.getId())
            .orElseGet(() -> {
                ChatRoomMember created = new ChatRoomMember();
                created.setCompany(company);
                created.setUser(user);
                String nickname = nicknameGenerator.generateUnique(
                    candidate -> chatRoomMemberRepository.existsByCompanyCompanyIdAndNickname(company.getCompanyId(), candidate)
                );
                created.setNickname(nickname);
                return chatRoomMemberRepository.save(created);
            });
    }

    private String normalizeMessage(String raw) {
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required");
        }
        String trimmed = raw.trim();
        if (trimmed.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required");
        }
        if (trimmed.length() > appProperties.getChat().getMaxMessageLength()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message too long");
        }
        return trimmed;
    }

    private void enforceChatCooldown(Long userId) {
        if (userId == null) {
            return;
        }
        long now = System.currentTimeMillis();
        long chatCooldownMs = appProperties.getChat().getCooldownMs();
        Long last = lastChatAtByUserId.put(userId, now);
        if (last != null && now - last < chatCooldownMs) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many chat messages");
        }
        long staleThreshold = chatCooldownMs * 20;
        lastChatAtByUserId.entrySet().removeIf(entry -> now - entry.getValue() > staleThreshold);
    }
}
