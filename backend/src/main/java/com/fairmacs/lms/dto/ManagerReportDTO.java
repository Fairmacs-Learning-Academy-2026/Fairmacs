package com.fairmacs.lms.dto;

import java.util.List;

public class ManagerReportDTO {

    private int teamMembers;
    private int overallCompletion;
    private int mandatoryCompliance;
    private int assessmentPerformance;

    private List<TeamMemberReportDTO> teamMembersData;

    public ManagerReportDTO() {
    }

    public ManagerReportDTO(
            int teamMembers,
            int overallCompletion,
            int mandatoryCompliance,
            int assessmentPerformance,
            List<TeamMemberReportDTO> teamMembersData
    ) {
        this.teamMembers = teamMembers;
        this.overallCompletion = overallCompletion;
        this.mandatoryCompliance = mandatoryCompliance;
        this.assessmentPerformance = assessmentPerformance;
        this.teamMembersData = teamMembersData;
    }

    public int getTeamMembers() {
        return teamMembers;
    }

    public void setTeamMembers(int teamMembers) {
        this.teamMembers = teamMembers;
    }

    public int getOverallCompletion() {
        return overallCompletion;
    }

    public void setOverallCompletion(int overallCompletion) {
        this.overallCompletion = overallCompletion;
    }

    public int getMandatoryCompliance() {
        return mandatoryCompliance;
    }

    public void setMandatoryCompliance(int mandatoryCompliance) {
        this.mandatoryCompliance = mandatoryCompliance;
    }

    public int getAssessmentPerformance() {
        return assessmentPerformance;
    }

    public void setAssessmentPerformance(int assessmentPerformance) {
        this.assessmentPerformance = assessmentPerformance;
    }

    public List<TeamMemberReportDTO> getTeamMembersData() {
        return teamMembersData;
    }

    public void setTeamMembersData(
            List<TeamMemberReportDTO> teamMembersData
    ) {
        this.teamMembersData = teamMembersData;
    }
}