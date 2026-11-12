package com.fairmacs.lms.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    public User() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String employeeId;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String roleLabel;

    private String designation;

    private String department;

    @Column(name = "level", nullable = true)
    private String level;

    @Column(name = "position_band", nullable = true)
    private String positionBand;

    @Column(name = "employment_type", nullable = true)
    private String employmentType;

    @Column(name = "reporting_manager_id", nullable = true)
    private Long reportingManagerId;

    private String branch;

    private String avatar;

    private String joiningDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @Column(name = "must_change_password", nullable = false, columnDefinition = "boolean default false")
    private Boolean mustChangePassword = false;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    @Column(name = "failed_login_attempts", nullable = false, columnDefinition = "integer default 0")
    private Integer failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    @JsonIgnore
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFullName() { return name; }
    public void setFullName(String fullName) { this.name = fullName; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getRoleLabel() { return roleLabel; }
    public void setRoleLabel(String roleLabel) { this.roleLabel = roleLabel; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getPositionBand() {
        if (positionBand != null && !positionBand.isBlank()) return positionBand;
        if (level != null && !level.isBlank()) return level;
        return "P1";
    }
    public void setPositionBand(String positionBand) { this.positionBand = positionBand; }

    public String getEmploymentType() {
        return employmentType != null && !employmentType.isBlank() ? employmentType : "FULL_TIME";
    }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }

    public Long getReportingManagerId() { return reportingManagerId; }
    public void setReportingManagerId(Long reportingManagerId) { this.reportingManagerId = reportingManagerId; }

    public String getPosition() { return level; }
    public void setPosition(String position) { this.level = position; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getJoiningDate() { return joiningDate; }
    public void setJoiningDate(String joiningDate) { this.joiningDate = joiningDate; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }

    public Boolean getMustChangePassword() {
        return mustChangePassword != null ? mustChangePassword : false;
    }
    public void setMustChangePassword(Boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword != null ? mustChangePassword : false;
    }

    public LocalDateTime getPasswordChangedAt() { return passwordChangedAt; }
    public void setPasswordChangedAt(LocalDateTime passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }

    public Integer getFailedLoginAttempts() {
        return failedLoginAttempts != null ? failedLoginAttempts : 0;
    }
    public void setFailedLoginAttempts(Integer failedLoginAttempts) {
        this.failedLoginAttempts = failedLoginAttempts != null ? failedLoginAttempts : 0;
    }

    public LocalDateTime getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(LocalDateTime lockedUntil) { this.lockedUntil = lockedUntil; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
