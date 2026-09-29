package com.fairmacs.lms.dto;

public class CategoryDTO {
    private Long id;
    private String slug;
    private String name;
    private String description;
    private String icon;
    private Integer sortOrder;
    private Boolean foundationTrack;
    private Integer courseCount;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public Boolean getFoundationTrack() { return foundationTrack; }
    public void setFoundationTrack(Boolean foundationTrack) { this.foundationTrack = foundationTrack; }
    public Integer getCourseCount() { return courseCount; }
    public void setCourseCount(Integer courseCount) { this.courseCount = courseCount; }
}
