package com.fairmacs.lms.dto;

public class PolicyCategoryDTO {

    private Long id;
    private String categoryName;
    private String code;
    private String description;
    private Boolean active;
    private Integer displayOrder;

    public PolicyCategoryDTO() {}

    public PolicyCategoryDTO(Long id, String categoryName, String code, String description, Boolean active, Integer displayOrder) {
        this.id = id;
        this.categoryName = categoryName;
        this.code = code;
        this.description = description;
        this.active = active;
        this.displayOrder = displayOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getName() { return categoryName; }
    public void setName(String name) { this.categoryName = name; }

    public String getIcon() { return null; }
    public void setIcon(String icon) {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
