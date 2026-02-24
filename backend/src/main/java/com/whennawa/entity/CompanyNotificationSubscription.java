package com.whennawa.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
    name = "company_notification_subscription",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_company_notification_subscription_user_company",
            columnNames = {"user_id", "company_id"}
        )
    },
    indexes = {
        @Index(name = "idx_company_notification_subscription_user", columnList = "user_id"),
        @Index(name = "idx_company_notification_subscription_company", columnList = "company_id")
    }
)
@Getter
@Setter
public class CompanyNotificationSubscription extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long subscriptionId;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
