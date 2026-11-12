package com.fairmacs.lms.dto;

import java.time.LocalDate;

public class UpcomingSessionDTO {

    private Long id;
    private String title;
    private String trainerName;
    private LocalDate date;
    private String time;
    private String startTime;
    private String endTime;
    private String status;
    private String type;
    private String department;
    private String location;
    private String joinUrl;

    public UpcomingSessionDTO() {
    }

    public UpcomingSessionDTO(
            Long id,
            String title,
            String trainerName,
            LocalDate date,
            String time,
            String startTime,
            String endTime,
            String status,
            String type,
            String department,
            String location,
            String joinUrl
    ) {
        this.id = id;
        this.title = title;
        this.trainerName = trainerName;
        this.date = date;
        this.time = time;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.type = type;
        this.department = department;
        this.location = location;
        this.joinUrl = joinUrl;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTrainerName() {
        return trainerName;
    }

    public void setTrainerName(String trainerName) {
        this.trainerName = trainerName;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getJoinUrl() {
        return joinUrl;
    }

    public void setJoinUrl(String joinUrl) {
        this.joinUrl = joinUrl;
    }
}
