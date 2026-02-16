package com.whennawa.entity;

import com.whennawa.entity.converter.RollingReportTypeConverter;
import com.whennawa.entity.enums.RollingReportType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "rolling_step_log")
@Getter @Setter
public class RollingStepLog extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rollingLogId;

    @ManyToOne
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "company_name", length = 100, nullable = false)
    private String companyName;

    @Column(name = "current_step_name", length = 100, nullable = false)
    private String currentStepName;

    @Convert(converter = RollingReportTypeConverter.class)
    @Column(name = "rolling_result_type", length = 32, nullable = false)
    private RollingReportType rollingResultType = RollingReportType.DATE_REPORTED;

    @Column(name = "prev_reported_date")
    private LocalDate prevReportedDate;

    @Column(name = "reported_date")
    private LocalDate reportedDate;

    @Column(name = "report_count", nullable = false)
    private Integer reportCount = 1;
}
