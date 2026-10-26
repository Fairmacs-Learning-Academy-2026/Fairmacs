package com.fairmacs.lms.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class CourseEmployeeDTO {

    private Long enrollmentId;
    private Long userId;
    private String employeeId;
    private String name;
    private String email;
    private String designation;
    private String department;
    private Integer progressPercent;
    private String status;
    private Integer score;
    private LocalDate dueDate;
    private LocalDateTime enrolledAt;
    private LocalDateTime completedDate;

    public CourseEmployeeDTO() {}

    public CourseEmployeeDTO(
            Long enrollmentId,
            Long userId,
            String employeeId,
            String name,
            String email,
            String designation,
            String department,
            Integer progressPercent,
            String status,
            Integer score,
            LocalDate dueDate,
            LocalDateTime enrolledAt,
            LocalDateTime completedDate
    ) {
        this.enrollmentId = enrollmentId;
        this.userId = userId;
        this.employeeId = employeeId;
        this.name = name;
        this.email = email;
        this.designation = designation;
        this.department = department;
        this.progressPercent = progressPercent;
        this.status = status;
        this.score = score;
        this.dueDate = dueDate;
        this.enrolledAt = enrolledAt;
        this.completedDate = completedDate;
    }

    public Long getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(Long enrollmentId) { this.enrollmentId = enrollmentId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Integer getProgressPercent() { return progressPercent; }
    public void setProgressPercent(Integer progressPercent) { this.progressPercent = progressPercent; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public LocalDateTime getEnrolledAt() { return enrolledAt; }
    public void setEnrolledAt(LocalDateTime enrolledAt) { this.enrolledAt = enrolledAt; }

    public LocalDateTime getCompletedDate() { return completedDate; }
    public void setCompletedDate(LocalDateTime completedDate) { this.completedDate = completedDate; }
}
