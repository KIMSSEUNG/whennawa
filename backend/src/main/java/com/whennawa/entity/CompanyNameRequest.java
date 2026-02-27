package com.whennawa.entity;

import com.whennawa.entity.enums.CompanyRequestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "company_name_request")
@Getter @Setter
public class CompanyNameRequest extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long requestId;

    @ManyToOne
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "original_company_name", length = 100, nullable = false)
    private String originalCompanyName;

    @Column(name = "normalized_company_name", length = 100, nullable = false)
    private String normalizedCompanyName;

    @Column(name = "request_count", nullable = false)
    private Integer requestCount = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private CompanyRequestStatus status = CompanyRequestStatus.PENDING;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "review_note", length = 200)
    private String reviewNote;
}
