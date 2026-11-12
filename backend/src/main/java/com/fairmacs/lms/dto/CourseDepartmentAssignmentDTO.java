package com.fairmacs.lms.dto;

import java.time.LocalDate;

public class CourseDepartmentAssignmentDTO {

    private Long id;
    private Long departmentId;
    private String departmentName;
    private String shortCode;
    private String assignmentType;
    private LocalDate dueDate;

    public CourseDepartmentAssignmentDTO() {}

    public CourseDepartmentAssignmentDTO(Long id, Long departmentId, String departmentName, String shortCode, String assignmentType, LocalDate dueDate) {
        this.id = id;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.shortCode = shortCode;
        this.assignmentType = assignmentType;
        this.dueDate = dueDate;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    public String getShortCode() {
        return shortCode;
    }

    public void setShortCode(String shortCode) {
        this.shortCode = shortCode;
    }

    public String getAssignmentType() {
        return assignmentType;
    }

    public void setAssignmentType(String assignmentType) {
        this.assignmentType = assignmentType;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }
}

