package com.whennawa.repository;

import com.whennawa.entity.ChatRoomMember;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {
    Optional<ChatRoomMember> findByCompanyCompanyIdAndUserId(Long companyId, Long userId);
    boolean existsByCompanyCompanyIdAndNickname(Long companyId, String nickname);
}
