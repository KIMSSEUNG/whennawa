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
@Table(name = "recruitment_step_pair")
@Getter
@Setter
public class RecruitmentStepPair extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long pairId;

    @ManyToOne
    @JoinColumn(name = "company_job_category_id", nullable = false)
    private CompanyJobCategory companyJobCategory;

    @ManyToOne
    @JoinColumn(name = "prev_step_master_id", nullable = false)
    private RecruitmentStepMaster prevStepMaster;

    @ManyToOne
    @JoinColumn(name = "current_step_master_id", nullable = false)
    private RecruitmentStepMaster currentStepMaster;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
