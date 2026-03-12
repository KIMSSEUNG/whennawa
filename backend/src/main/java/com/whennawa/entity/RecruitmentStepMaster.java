package com.whennawa.entity;

import com.whennawa.entity.enums.StepKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "recruitment_step_master")
@Getter
@Setter
public class RecruitmentStepMaster extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long stepMasterId;

    @Column(name = "step_name", length = 100, nullable = false, unique = true)
    private String stepName;

    @Enumerated(EnumType.STRING)
    @Column(name = "step_kind", length = 16, nullable = false)
    private StepKind stepKind = StepKind.BOTH;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
