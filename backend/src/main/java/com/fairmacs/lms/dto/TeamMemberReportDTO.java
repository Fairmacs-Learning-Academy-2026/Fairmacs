package com.fairmacs.lms.dto;

public class TeamMemberReportDTO {

    private Long userId;
    private String employeeId;
    private String name;
    private String designation;

    private int assigned;
    private int completed;
    private int progress;

    private String status;

    public TeamMemberReportDTO() {
    }

    public TeamMemberReportDTO(
            Long userId,
            String employeeId,
            String name,
            String designation,
            int assigned,
            int completed,
            int progress,
            String status
    ) {
        this.userId = userId;
        this.employeeId = employeeId;
        this.name = name;
        this.designation = designation;
        this.assigned = assigned;
        this.completed = completed;
        this.progress = progress;
        this.status = status;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public int getAssigned() {
        return assigned;
    }

    public void setAssigned(int assigned) {
        this.assigned = assigned;
    }

    public int getCompleted() {
        return completed;
    }

    public void setCompleted(int completed) {
        this.completed = completed;
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}