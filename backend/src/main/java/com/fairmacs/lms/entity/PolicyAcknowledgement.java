package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "policy_acknowledgements",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_policy_ack_ver_user", columnNames = {"policy_version_id", "employee_user_id"})
        }
)
public class PolicyAcknowledgement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_assignment_id", nullable = false)
    private PolicyAssignment policyAssignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_document_id", nullable = false)
    private PolicyDocument policyDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_version_id", nullable = false)
    private PolicyVersion policyVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_user_id", nullable = false)
    private User employeeUser;

    @Column(name = "employee_id_snapshot", nullable = false)
    private String employeeIdSnapshot;

    @Column(name = "accepted_at", nullable = false)
    private LocalDateTime acceptedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authenticated_user_id", nullable = false)
    private User authenticatedUser;

    @Column(name = "document_sha256_hash", nullable = false, length = 64)
    private String documentSha256Hash;

    @Column(name = "acknowledgement_text_version", nullable = false, columnDefinition = "TEXT")
    private String acknowledgementTextVersion;

    @Column(name = "request_ip", length = 100)
    private String requestIp;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PolicyAcknowledgement() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PolicyAssignment getPolicyAssignment() { return policyAssignment; }
    public void setPolicyAssignment(PolicyAssignment policyAssignment) { this.policyAssignment = policyAssignment; }

    public PolicyDocument getPolicyDocument() { return policyDocument; }
    public void setPolicyDocument(PolicyDocument policyDocument) { this.policyDocument = policyDocument; }

    public PolicyVersion getPolicyVersion() { return policyVersion; }
    public void setPolicyVersion(PolicyVersion policyVersion) { this.policyVersion = policyVersion; }

    public User getEmployeeUser() { return employeeUser; }
    public void setEmployeeUser(User employeeUser) { this.employeeUser = employeeUser; }

    public String getEmployeeIdSnapshot() { return employeeIdSnapshot; }
    public void setEmployeeIdSnapshot(String employeeIdSnapshot) { this.employeeIdSnapshot = employeeIdSnapshot; }

    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }

    public User getAuthenticatedUser() { return authenticatedUser; }
    public void setAuthenticatedUser(User authenticatedUser) { this.authenticatedUser = authenticatedUser; }

    public String getDocumentSha256Hash() { return documentSha256Hash; }
    public void setDocumentSha256Hash(String documentSha256Hash) { this.documentSha256Hash = documentSha256Hash; }

    public String getAcknowledgementTextVersion() { return acknowledgementTextVersion; }
    public void setAcknowledgementTextVersion(String acknowledgementTextVersion) { this.acknowledgementTextVersion = acknowledgementTextVersion; }

    public String getRequestIp() { return requestIp; }
    public void setRequestIp(String requestIp) { this.requestIp = requestIp; }

    public String getIpAddress() { return requestIp; }
    public void setIpAddress(String ip) { this.requestIp = ip; }

    public String getAcknowledgementType() { return "STANDARD"; }
    public void setAcknowledgementType(String type) {}

    public String getComments() { return acknowledgementTextVersion; }
    public void setComments(String comments) { if (comments != null && !comments.isBlank()) this.acknowledgementTextVersion = comments; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
