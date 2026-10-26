package com.fairmacs.lms.dto;

public class DepartmentCourseDTO {
    private Long courseId;
    private String courseCode;
    private String title;
    private Boolean active;
    private int enrolledEmployees;
    private double completionRate;

    public DepartmentCourseDTO() {}

    public DepartmentCourseDTO(Long courseId, String courseCode, String title,
                               Boolean active, int enrolledEmployees, double completionRate) {
        this.courseId = courseId;
        this.courseCode = courseCode;
        this.title = title;
        this.active = active;
        this.enrolledEmployees = enrolledEmployees;
        this.completionRate = completionRate;
    }

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public int getEnrolledEmployees() { return enrolledEmployees; }
    public void setEnrolledEmployees(int enrolledEmployees) { this.enrolledEmployees = enrolledEmployees; }
    public double getCompletionRate() { return completionRate; }
    public void setCompletionRate(double completionRate) { this.completionRate = completionRate; }
}
