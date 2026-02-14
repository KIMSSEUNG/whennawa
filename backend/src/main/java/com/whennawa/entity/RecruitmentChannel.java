package com.whennawa.entity;

import com.whennawa.entity.enums.RecruitmentChannelType;
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
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "recruitment_channel")
@Getter @Setter
public class RecruitmentChannel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long channelId;

    @ManyToOne
    @JoinColumn(name = "unit_id", nullable = false)
    private RecruitmentUnit unit;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", length = 16, nullable = false)
    private RecruitmentChannelType channelType;

    @Column(name = "year", nullable = false)
    private int year;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
