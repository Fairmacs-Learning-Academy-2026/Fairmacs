package com.fairmacs.lms.dto;

import com.fairmacs.lms.entity.PolicyVersionType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PolicyVersionDTO {

    private Long id;
    private Long policyDocumentId;
    private String versionNumber;
    private PolicyVersionType versionType;
    private String workdriveFileId;
    private String workdriveFileName;
    private String fileMimeType;
    private Long fileSize;
    private String sha256Hash;
    private LocalDate effectiveDate;
    private Boolean allowDownload;
    private String versionNotes;
    private String createdByEmployeeId;
    private String createdByName;
    private LocalDateTime createdAt;

    public PolicyVersionDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPolicyDocumentId() { return policyDocumentId; }
    public void setPolicyDocumentId(Long policyDocumentId) { this.policyDocumentId = policyDocumentId; }

    public String getVersionNumber() { return versionNumber; }
    public void setVersionNumber(String versionNumber) { this.versionNumber = versionNumber; }

    public PolicyVersionType getVersionType() { return versionType; }
    public void setVersionType(PolicyVersionType versionType) { this.versionType = versionType; }
    public void setVersionType(String versionType) {
        this.versionType = versionType != null ? PolicyVersionType.valueOf(versionType) : PolicyVersionType.MAJOR;
    }

    public void setWorkdriveFolderId(String folderId) {}
    public void setCreatedByUserId(Long userId) {}
    public void setCreatedByUserName(String name) { this.createdByName = name; }

    public String getWorkdriveFileId() { return workdriveFileId; }
    public void setWorkdriveFileId(String workdriveFileId) { this.workdriveFileId = workdriveFileId; }

    public String getWorkdriveFileName() { return workdriveFileName; }
    public void setWorkdriveFileName(String workdriveFileName) { this.workdriveFileName = workdriveFileName; }

    public String getFileMimeType() { return fileMimeType; }
    public void setFileMimeType(String fileMimeType) { this.fileMimeType = fileMimeType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getSha256Hash() { return sha256Hash; }
    public void setSha256Hash(String sha256Hash) { this.sha256Hash = sha256Hash; }

    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }

    public Boolean getAllowDownload() { return allowDownload; }
    public void setAllowDownload(Boolean allowDownload) { this.allowDownload = allowDownload; }

    public String getVersionNotes() { return versionNotes; }
    public void setVersionNotes(String versionNotes) { this.versionNotes = versionNotes; }

    public String getCreatedByEmployeeId() { return createdByEmployeeId; }
    public void setCreatedByEmployeeId(String createdByEmployeeId) { this.createdByEmployeeId = createdByEmployeeId; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
