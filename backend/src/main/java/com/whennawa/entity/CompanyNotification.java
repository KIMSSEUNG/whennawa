package com.whennawa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
    name = "company_notification",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_company_notification_user_company_event_date",
            columnNames = {"user_id", "company_id", "event_date"}
        )
    },
    indexes = {
        @Index(name = "idx_company_notification_user_updated", columnList = "user_id,updated_at"),
        @Index(name = "idx_company_notification_company_event", columnList = "company_id,event_date")
    }
)
@Getter
@Setter
public class CompanyNotification extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long notificationId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(name = "first_reporter_nickname", nullable = false, length = 64)
    private String firstReporterNickname;

    @Column(name = "reporter_message", length = 200)
    private String reporterMessage;

    @Column(name = "reporter_count", nullable = false)
    private Integer reporterCount = 1;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;
}
