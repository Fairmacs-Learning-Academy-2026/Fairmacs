package com.fairmacs.lms.dto;

public class TrainingCalendarEmployeeDTO {
    private final Long id;
    private final String employeeId;
    private final String name;
    private final String department;
    private final String designation;

    public TrainingCalendarEmployeeDTO(Long id, String employeeId, String name, String department, String designation) {
        this.id = id; this.employeeId = employeeId; this.name = name; this.department = department; this.designation = designation;
    }
    public Long getId() { return id; }
    public String getEmployeeId() { return employeeId; }
    public String getName() { return name; }
    public String getDepartment() { return department; }
    public String getDesignation() { return designation; }
}
