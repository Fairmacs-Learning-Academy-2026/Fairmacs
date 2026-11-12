package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "policy_versions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_policy_versions_doc_ver", columnNames = {"policy_document_id", "version_number"})
        }
)
public class PolicyVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_document_id", nullable = false)
    private PolicyDocument policyDocument;

    @Column(name = "version_number", nullable = false, length = 50)
    private String versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "version_type", nullable = false, length = 50)
    private PolicyVersionType versionType = PolicyVersionType.MAJOR;

    @Column(name = "workdrive_file_id", nullable = false)
    private String workdriveFileId;

    @Column(name = "workdrive_file_name", nullable = false)
    private String workdriveFileName;

    @Column(name = "workdrive_folder_id")
    private String workdriveFolderId;

    @Column(name = "file_mime_type", nullable = false, length = 100)
    private String fileMimeType = "application/pdf";

    @Column(name = "file_size", nullable = false)
    private Long fileSize = 0L;

    @Column(name = "sha256_hash", nullable = false, length = 64)
    private String sha256Hash;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "allow_download", nullable = false)
    private Boolean allowDownload = true;

    @Column(name = "version_notes", columnDefinition = "TEXT")
    private String versionNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PolicyVersion() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PolicyDocument getPolicyDocument() { return policyDocument; }
    public void setPolicyDocument(PolicyDocument policyDocument) { this.policyDocument = policyDocument; }

    public String getVersionNumber() { return versionNumber; }
    public void setVersionNumber(String versionNumber) { this.versionNumber = versionNumber; }

    public PolicyVersionType getVersionType() { return versionType; }
    public void setVersionType(PolicyVersionType versionType) { this.versionType = versionType; }

    public String getWorkdriveFileId() { return workdriveFileId; }
    public void setWorkdriveFileId(String workdriveFileId) { this.workdriveFileId = workdriveFileId; }

    public String getWorkdriveFileName() { return workdriveFileName; }
    public void setWorkdriveFileName(String workdriveFileName) { this.workdriveFileName = workdriveFileName; }

    public String getWorkdriveFolderId() { return workdriveFolderId; }
    public void setWorkdriveFolderId(String workdriveFolderId) { this.workdriveFolderId = workdriveFolderId; }

    public String getFileMimeType() { return fileMimeType; }
    public void setFileMimeType(String fileMimeType) { this.fileMimeType = fileMimeType; }

    public Long getFileSize() { return fileSize != null ? fileSize : 0L; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize != null ? fileSize : 0L; }

    public String getSha256Hash() { return sha256Hash; }
    public void setSha256Hash(String sha256Hash) { this.sha256Hash = sha256Hash; }

    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }

    public Boolean getAllowDownload() { return allowDownload != null ? allowDownload : true; }
    public void setAllowDownload(Boolean allowDownload) { this.allowDownload = allowDownload != null ? allowDownload : true; }

    public String getVersionNotes() { return versionNotes; }
    public void setVersionNotes(String versionNotes) { this.versionNotes = versionNotes; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
