package com.whennawa.entity;

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

    @ManyToOne
    @JoinColumn(name = "step_master_id", nullable = false)
    private RecruitmentStepMaster stepMaster;

    public String getStepName() {
        return stepMaster == null ? null : stepMaster.getStepName();
    }
}
