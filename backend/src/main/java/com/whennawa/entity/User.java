package com.whennawa.entity;

import com.whennawa.util.UUIDBinaryConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import com.whennawa.entity.enums.UserRole;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "users")
@Getter @Setter
public class User extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", columnDefinition = "BINARY(16)", nullable = false, unique = true)
    private byte[] publicId;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UserRole role = UserRole.USER;

    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;

    protected User() {
    }

    public User(String email) {
        this.email = email;
        this.role = UserRole.USER;
    }

    @PrePersist
    protected void prePersistPublicId() {
        if (this.publicId == null) {
            this.publicId = UUIDBinaryConverter.uuidToBytes(UUID.randomUUID());
        }
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void markDeleted(java.time.LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public void restore() {
        this.deletedAt = null;
        setCreatedAt(java.time.LocalDateTime.now());
    }
}





