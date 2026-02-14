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
@Table(name = "recruitment_step")
@Getter @Setter
public class RecruitmentStep {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long stepId;

    @ManyToOne
    @JoinColumn(name = "channel_id", nullable = false)
    private RecruitmentChannel channel;

    @Column(name = "step_name", length = 100, nullable = false)
    private String stepName;

    @Column(name = "step_order", nullable = false)
    private int stepOrder;

    @Column(name = "prev_step_id")
    private Integer prevStepId;

    @Column(name = "next_step_id")
    private Integer nextStepId;

}
