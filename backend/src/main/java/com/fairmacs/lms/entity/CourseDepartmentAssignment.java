package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "course_department_assignments",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_course_department_assignment",
                columnNames = {"course_id", "department_id"}
        )
)
public class CourseDepartmentAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false, foreignKey = @ForeignKey(name = "fk_cda_course_id"))
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false, foreignKey = @ForeignKey(name = "fk_cda_department_id"))
    private Department department;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_type", nullable = false, length = 32)
    private EnrollmentType assignmentType = EnrollmentType.MANDATORY;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public CourseDepartmentAssignment() {}

    public CourseDepartmentAssignment(Course course, Department department, EnrollmentType assignmentType, LocalDate dueDate) {
        this.course = course;
        this.department = department;
        this.assignmentType = assignmentType != null ? assignmentType : EnrollmentType.MANDATORY;
        this.dueDate = dueDate;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
    }

    public EnrollmentType getAssignmentType() {
        return assignmentType;
    }

    public void setAssignmentType(EnrollmentType assignmentType) {
        this.assignmentType = assignmentType;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

