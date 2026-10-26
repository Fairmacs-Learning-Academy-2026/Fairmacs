package com.fairmacs.lms.dto;

import com.fairmacs.lms.entity.TrainingSessionTargetType;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class TrainingSessionRequest {
    private String title;
    private LocalDate date;
    private String time;
    private String trainer;
    private TrainingSessionTargetType targetType = TrainingSessionTargetType.ALL;
    private String department;
    private List<Long> targetUserIds = new ArrayList<>();
    private String location;
    private String type = "Workshop";

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getTrainer() { return trainer; }
    public void setTrainer(String trainer) { this.trainer = trainer; }
    public TrainingSessionTargetType getTargetType() { return targetType; }
    public void setTargetType(TrainingSessionTargetType targetType) { this.targetType = targetType; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public List<Long> getTargetUserIds() { return targetUserIds; }
    public void setTargetUserIds(List<Long> targetUserIds) { this.targetUserIds = targetUserIds == null ? new ArrayList<>() : targetUserIds; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
