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
@Table(name = "recruitment_channel")
@Getter @Setter
public class RecruitmentChannel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long channelId;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "year", nullable = false)
    private int year;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
