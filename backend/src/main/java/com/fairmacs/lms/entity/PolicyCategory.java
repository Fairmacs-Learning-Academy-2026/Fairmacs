package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "policy_categories")
public class PolicyCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_name", nullable = false, unique = true, length = 150)
    private String categoryName;

    @Column(name = "code", nullable = false, unique = true, length = 100)
    private String code;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PolicyCategory() {}

    public PolicyCategory(String categoryName, String code, String description, Integer displayOrder) {
        this.categoryName = categoryName;
        this.code = code;
        this.description = description;
        this.displayOrder = displayOrder != null ? displayOrder : 0;
        this.active = true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getName() { return categoryName; }
    public void setName(String name) { this.categoryName = name; }

    public String getIcon() { return "file-text"; }
    public void setIcon(String icon) {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getActive() { return active != null ? active : true; }
    public void setActive(Boolean active) { this.active = active != null ? active : true; }

    public Integer getDisplayOrder() { return displayOrder != null ? displayOrder : 0; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder != null ? displayOrder : 0; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
