package com.whennawa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "user_block")
@Getter
@Setter
public class UserBlock extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long blockId;

    @ManyToOne
    @JoinColumn(name = "blocker_user_id", nullable = false)
    private User blocker;

    @ManyToOne
    @JoinColumn(name = "blocked_user_id", nullable = false)
    private User blocked;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
