package com.fairmacs.lms.dto;

public class DepartmentEmployeeDTO {
    private Long id;
    private String employeeId;
    private String name;
    private String email;
    private String designation;
    private String department;
    private String status;

    public DepartmentEmployeeDTO() {}

    public DepartmentEmployeeDTO(Long id, String employeeId, String name, String email,
                                 String designation, String department, String status) {
        this.id = id;
        this.employeeId = employeeId;
        this.name = name;
        this.email = email;
        this.designation = designation;
        this.department = department;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
