package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "policy_assignments",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_policy_assignments_ver_user", columnNames = {"policy_version_id", "employee_user_id"})
        }
)
public class PolicyAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_document_id", nullable = false)
    private PolicyDocument policyDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_version_id", nullable = false)
    private PolicyVersion policyVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_user_id", nullable = false)
    private User employeeUser;

    @Column(name = "employee_id_snapshot", nullable = false)
    private String employeeIdSnapshot;

    @Column(name = "department_id_snapshot")
    private Long departmentIdSnapshot;

    @Column(name = "department_name_snapshot")
    private String departmentNameSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_source", nullable = false, length = 50)
    private PolicyAssignmentSource assignmentSource = PolicyAssignmentSource.ALL_EMPLOYEES;

    @Column(name = "mandatory", nullable = false)
    private Boolean mandatory = true;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status", nullable = false, length = 50)
    private PolicyAssignmentStatus assignmentStatus = PolicyAssignmentStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by", nullable = false)
    private User assignedBy;

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private LocalDateTime assignedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PolicyAssignment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PolicyDocument getPolicyDocument() { return policyDocument; }
    public void setPolicyDocument(PolicyDocument policyDocument) { this.policyDocument = policyDocument; }

    public PolicyVersion getPolicyVersion() { return policyVersion; }
    public void setPolicyVersion(PolicyVersion policyVersion) { this.policyVersion = policyVersion; }

    public User getEmployeeUser() { return employeeUser; }
    public void setEmployeeUser(User employeeUser) { this.employeeUser = employeeUser; }

    public String getEmployeeIdSnapshot() { return employeeIdSnapshot; }
    public void setEmployeeIdSnapshot(String employeeIdSnapshot) { this.employeeIdSnapshot = employeeIdSnapshot; }

    public Long getDepartmentIdSnapshot() { return departmentIdSnapshot; }
    public void setDepartmentIdSnapshot(Long departmentIdSnapshot) { this.departmentIdSnapshot = departmentIdSnapshot; }

    public String getDepartmentNameSnapshot() { return departmentNameSnapshot; }
    public void setDepartmentNameSnapshot(String departmentNameSnapshot) { this.departmentNameSnapshot = departmentNameSnapshot; }

    public PolicyAssignmentSource getAssignmentSource() { return assignmentSource; }
    public void setAssignmentSource(PolicyAssignmentSource assignmentSource) { this.assignmentSource = assignmentSource; }

    public Boolean getMandatory() { return mandatory != null ? mandatory : true; }
    public void setMandatory(Boolean mandatory) { this.mandatory = mandatory != null ? mandatory : true; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public PolicyAssignmentStatus getAssignmentStatus() { return assignmentStatus; }
    public void setAssignmentStatus(PolicyAssignmentStatus assignmentStatus) { this.assignmentStatus = assignmentStatus; }

    public User getAssignedBy() { return assignedBy; }
    public void setAssignedBy(User assignedBy) { this.assignedBy = assignedBy; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
