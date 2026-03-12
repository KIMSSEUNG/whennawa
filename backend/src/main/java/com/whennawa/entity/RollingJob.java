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
@Table(name = "rolling_job")
@Getter
@Setter
public class RollingJob extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rolling_job_id")
    private Long rollingJobId;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "job_name", length = 100, nullable = false)
    private String jobName;

    @Column(name = "normalized_job_name", length = 100, nullable = false)
    private String normalizedJobName;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
