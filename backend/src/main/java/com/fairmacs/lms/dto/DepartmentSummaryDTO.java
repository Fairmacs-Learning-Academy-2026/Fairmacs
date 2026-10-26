package com.fairmacs.lms.dto;

public class DepartmentSummaryDTO {
    private Long id;
    private String name;
    private String headId;
    private String description;
    private int employeeCount;
    private int assignedCoursesCount;
    private double completionRate;

    public DepartmentSummaryDTO() {}

    public DepartmentSummaryDTO(Long id, String name, String headId, String description,
                                int employeeCount, int assignedCoursesCount, double completionRate) {
        this.id = id;
        this.name = name;
        this.headId = headId;
        this.description = description;
        this.employeeCount = employeeCount;
        this.assignedCoursesCount = assignedCoursesCount;
        this.completionRate = completionRate;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getHeadId() { return headId; }
    public void setHeadId(String headId) { this.headId = headId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public int getEmployeeCount() { return employeeCount; }
    public void setEmployeeCount(int employeeCount) { this.employeeCount = employeeCount; }
    public int getAssignedCoursesCount() { return assignedCoursesCount; }
    public void setAssignedCoursesCount(int assignedCoursesCount) { this.assignedCoursesCount = assignedCoursesCount; }
    public double getCompletionRate() { return completionRate; }
    public void setCompletionRate(double completionRate) { this.completionRate = completionRate; }
}
