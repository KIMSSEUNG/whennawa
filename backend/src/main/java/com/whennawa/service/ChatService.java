package com.whennawa.service;

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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ChatService {
    private static final int MAX_MESSAGE_LENGTH = 300;

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final NicknameGenerator nicknameGenerator;

    @Transactional
    public ChatMessageResponse processAndSave(ChatMessageRequest request, Long userId) {
        if (request == null || request.getCompanyId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid request");
        }
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
        message.setMessage(messageText);
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
        int boundedLimit = Math.max(1, Math.min(limit, 100));
        List<ChatMessage> recent = chatMessageRepository.findTop100ByCompanyCompanyIdOrderByCreatedAtDesc(companyId);
        return recent.stream()
            .limit(boundedLimit)
            .sorted(Comparator.comparing(ChatMessage::getCreatedAt))
            .map(m -> new ChatMessageResponse(
                m.getCompany().getCompanyId(),
                m.getSenderNickname(),
                m.getMessage(),
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
        if (trimmed.length() > MAX_MESSAGE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message too long");
        }
        return trimmed;
    }
}
