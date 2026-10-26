package com.fairmacs.lms.dto;

import java.util.List;

public class DepartmentCourseEmployeesDTO {

    private Long departmentId;
    private String departmentName;
    private Long courseId;
    private String courseCode;
    private String title;
    private Boolean active;
    private int totalEnrolled;
    private List<CourseEmployeeDTO> employees;

    public DepartmentCourseEmployeesDTO() {}

    public DepartmentCourseEmployeesDTO(
            Long departmentId,
            String departmentName,
            Long courseId,
            String courseCode,
            String title,
            Boolean active,
            int totalEnrolled,
            List<CourseEmployeeDTO> employees
    ) {
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.courseId = courseId;
        this.courseCode = courseCode;
        this.title = title;
        this.active = active;
        this.totalEnrolled = totalEnrolled;
        this.employees = employees;
    }

    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public int getTotalEnrolled() { return totalEnrolled; }
    public void setTotalEnrolled(int totalEnrolled) { this.totalEnrolled = totalEnrolled; }

    public List<CourseEmployeeDTO> getEmployees() { return employees; }
    public void setEmployees(List<CourseEmployeeDTO> employees) { this.employees = employees; }
}
