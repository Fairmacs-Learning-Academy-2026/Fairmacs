package com.fairmacs.lms.dto;

import java.util.List;

public class DepartmentDetailsDTO {
    private Long id;
    private String name;
    private String headId;
    private String description;
    private int employeeCount;
    private int assignedCoursesCount;
    private int ownedCoursesCount;
    private int mandatoryAssignmentsCount;
    private int recommendedAssignmentsCount;
    private int overdueAssignmentsCount;
    private double averageAssessmentScore;
    private double completionRate;
    private List<DepartmentEmployeeDTO> employees;
    private List<DepartmentCourseDTO> courses;

    public DepartmentDetailsDTO() {}

    public DepartmentDetailsDTO(Long id, String name, String headId, String description,
                                int employeeCount, int assignedCoursesCount, double completionRate,
                                List<DepartmentEmployeeDTO> employees, List<DepartmentCourseDTO> courses) {
        this.id = id;
        this.name = name;
        this.headId = headId;
        this.description = description;
        this.employeeCount = employeeCount;
        this.assignedCoursesCount = assignedCoursesCount;
        this.completionRate = completionRate;
        this.employees = employees;
        this.courses = courses;
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
    public int getOwnedCoursesCount() { return ownedCoursesCount; }
    public void setOwnedCoursesCount(int ownedCoursesCount) { this.ownedCoursesCount = ownedCoursesCount; }
    public int getMandatoryAssignmentsCount() { return mandatoryAssignmentsCount; }
    public void setMandatoryAssignmentsCount(int mandatoryAssignmentsCount) { this.mandatoryAssignmentsCount = mandatoryAssignmentsCount; }
    public int getRecommendedAssignmentsCount() { return recommendedAssignmentsCount; }
    public void setRecommendedAssignmentsCount(int recommendedAssignmentsCount) { this.recommendedAssignmentsCount = recommendedAssignmentsCount; }
    public int getOverdueAssignmentsCount() { return overdueAssignmentsCount; }
    public void setOverdueAssignmentsCount(int overdueAssignmentsCount) { this.overdueAssignmentsCount = overdueAssignmentsCount; }
    public double getAverageAssessmentScore() { return averageAssessmentScore; }
    public void setAverageAssessmentScore(double averageAssessmentScore) { this.averageAssessmentScore = averageAssessmentScore; }
    public double getCompletionRate() { return completionRate; }
    public void setCompletionRate(double completionRate) { this.completionRate = completionRate; }
    public List<DepartmentEmployeeDTO> getEmployees() { return employees; }
    public void setEmployees(List<DepartmentEmployeeDTO> employees) { this.employees = employees; }
    public List<DepartmentCourseDTO> getCourses() { return courses; }
    public void setCourses(List<DepartmentCourseDTO> courses) { this.courses = courses; }
}
