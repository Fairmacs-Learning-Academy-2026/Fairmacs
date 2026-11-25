# Fairmacs KMS — Production Security Release Checklist

**Document Reference:** SEC-CHK-v1.0  
**Target Release:** Production Deployment / Release Candidate  
**Audience:** Security Auditors, DevOps Engineers, Full-Stack Developers, QA Leads  
**Application:** Fairmacs Enterprise Knowledge Management System

---

## 📑 Table of Contents
1. [Checklist Overview & How to Use](#1-checklist-overview--how-to-use)
2. [Phase 1: Code Repository & Credential Hygiene](#2-phase-1-code-repository--credential-hygiene)
3. [Phase 2: Authentication & Token Security](#3-phase-2-authentication--token-security)
4. [Phase 3: Authorization (RBAC) & Access Control](#4-phase-3-authorization-rbac--access-control)
5. [Phase 4: Input Validation & Injection Prevention](#5-phase-4-input-validation--injection-prevention)
6. [Phase 5: File Ingestion & Spreadsheet Security](#6-phase-5-file-ingestion--spreadsheet-security)
7. [Phase 6: Cloud Integration & OAuth Security](#7-phase-6-cloud-integration--oauth-security)
8. [Phase 7: Network, Transport & CORS Hardening](#8-phase-7-network-transport--cors-hardening)
9. [Phase 8: Logging, Auditability & Error Handling](#9-phase-8-logging-auditability--error-handling)
10. [Phase 9: Automated Verification Commands](#10-phase-9-automated-verification-commands)
11. [Phase 10: Security Sign-Off & Deployment Approval](#11-phase-10-security-sign-off--deployment-approval)

---

## 1. Checklist Overview & How to Use

This checklist is mandatory prior to promoting any release candidate of **Fairmacs KMS** to staging or production. Every item must be verified, tested, and marked with a checkmark (`[x]`). Any failed item must be documented with an associated remediation issue before production release approval.

---

## 2. Phase 1: Code Repository & Credential Hygiene

- [ ] **No Hardcoded Passwords:** Grep codebase for `password = "..."` or hardcoded database passwords.
- [ ] **No Hardcoded API Keys or Secrets:** Verified that `JWT_SECRET`, `ZOHO_CLIENT_SECRET`, and `ZOHO_TOKEN_ENCRYPTION_KEY` are read exclusively from environment variables.
- [ ] **Git Exclusion Rules Verified:** `.gitignore` properly excludes:
  - `.env`, `.env.*` (except `.env.example`)
  - `application-local.properties`, `*local.properties`
  - `backups/`, `*.dump`, `*.sql`, `*.bak`
  - `backend/uploads/`, `uploads/`
  - `.vscode/`, `.trae/`, `.idea/`
- [ ] **Sanitized Example Templates:** `application.properties.example` and `.env.example` contain only placeholder documentation strings.
- [ ] **Clean Git Commit History:** No credentials or database dumps present in previous git commits (`git log -S "password"`).

---

## 3. Phase 2: Authentication & Token Security

- [ ] **BCrypt Password Hashing:** All user passwords in the `users` table are hashed using `BCryptPasswordEncoder` with a cost factor $\ge 10$. Plaintext passwords are never stored.
- [ ] **JWT Secret Key Entropy:** Production `JWT_SECRET` is at least 256 bits (32 bytes) of cryptographically secure random entropy.
- [ ] **JWT Token Expiration:** Tokens strictly expire after 24 hours (`86,400,000 ms`).
- [ ] **Inactive / Terminated Account Invalidation:** `JwtAuthenticationFilter` rejects requests from users with `status = TERMINATED` or `status = INACTIVE`, even if their token has not yet expired.
- [ ] **Current Password Verification:** Changing user password requires valid verification of the current password before the new hash is written.
- [ ] **Session Invalidation on Logout:** Client application purges stored tokens (`fairmacs_token`, `fairmacs_user`) upon logout.

---

## 4. Phase 3: Authorization (RBAC) & Access Control

- [ ] **Default Deny Filter:** `SecurityConfig.java` enforces `anyRequest().authenticated()` for all routes not explicitly declared public.
- [ ] **Method-Level Security Active:** `@EnableMethodSecurity(prePostEnabled = true)` is present on security configuration.
- [ ] **HR Admin Endpoint Protection:** All `/api/hr-admin/**` and `/api/course-assignments/**` endpoints enforce `@PreAuthorize("hasRole('HR_ADMIN')")`.
- [ ] **Trainer Endpoint Protection:** Course authoring `/api/courses/authoring/**` enforces `@PreAuthorize("hasAnyRole('TRAINER', 'HR_ADMIN')")`.
- [ ] **Horizontal IDOR Protection:** Manager report endpoints verify that the requested employee is a direct report or member of the manager's assigned department.
- [ ] **Server-Side Quiz Integrity:**
  - Quiz questions endpoint `/api/quizzes/course/{id}` strips correct answer flags before responding.
  - Quiz submission endpoint `/api/quizzes/submit` calculates scores on the server.
- [ ] **Draft Isolation:** Unpublished course drafts are blocked from standard learner catalog queries.

---

## 5. Phase 4: Input Validation & Injection Prevention

- [ ] **SQL Injection Defense:** All queries use Spring Data JPA repository methods or parameterized queries with `@Param`. No string concatenation in SQL queries.
- [ ] **Cross-Site Scripting (XSS) Defense:** React JSX safely escapes text variables. Dynamic HTML components use DOMPurify sanitization.
- [ ] **Path Traversal Defense:** Document streaming and download endpoints validate file identifiers and block `../` directory navigation.
- [ ] **Email Format Validation:** User creation and bulk import endpoints validate email addresses with RFC-compliant regular expressions.
- [ ] **Data Type Validation:** Request DTOs validate numeric identifiers, date formats, and required non-empty string properties.

---

## 6. Phase 5: File Ingestion & Spreadsheet Security

- [ ] **Upload Size Ceiling:** Spring Boot multipart request size is capped at 10MB (`spring.servlet.multipart.max-file-size=10MB`).
- [ ] **MIME Whitelisting:** Document uploads only accept validated PDF and DOCX files.
- [ ] **Apache POI XXE Protection:** XML entity expansion is disabled to prevent XML External Entity (XXE) attacks during spreadsheet parsing.
- [ ] **Zip-Bomb Mitigation:** Ingestion memory buffer thresholds prevent decompression bomb denial-of-service.
- [ ] **CSV / Formula Injection Sanitization:** Cell values starting with `=`, `+`, `-`, or `@` are sanitized before persistence or export.
- [ ] **Storage Isolation:** Uploaded documents and certificates are stored in dedicated directories outside the public web root.
- [ ] **Dynamic PDF Watermark Boundary Check:** Verified that `PolicyWatermarkService` enforces strict mathematical non-clipping boundary checks on rotated watermarks across A4 and Letter page formats.
- [ ] **Policy Acknowledgement Non-Repudiation:** Verified that employee policy acknowledgements capture digital signature, remote IP address snapshot, and UTC timestamp in immutable database rows.

---

## 7. Phase 6: Cloud Integration & OAuth Security

- [ ] **OAuth State Verification:** Zoho OAuth 2.0 flow generates and validates a cryptographically secure `state` parameter to mitigate CSRF attacks on callbacks.
- [ ] **AES-256-GCM Token Encryption:** Refresh tokens in `zoho_oauth_tokens` table are encrypted using AES-256-GCM with a dynamic 12-byte IV per entry.
- [ ] **No Client-Side Cloud Credentials:** The frontend never directly receives or handles the Zoho WorkDrive OAuth access token.
- [ ] **Authenticated Document Proxy:** All lesson documents are streamed through backend controllers after verifying user enrollment.
- [ ] **Automatic Token Renewal:** Expired access tokens refresh automatically in background services without requiring admin intervention.
- [ ] **Container Least Privilege:** Backend Docker container runs under non-root system UID 1001 with restricted capabilities and heap memory limits (`-XX:MaxRAMPercentage=70`).
- [ ] **Render Blueprint Secret Synchronization:** Sensitive credentials in `render.yaml` are marked `sync: false` to ensure zero secrets are persisted in Git.

---

## 8. Phase 7: Network, Transport & CORS Hardening

- [ ] **HTTPS / TLS 1.3 Enforced:** Production reverse proxy (NGINX / Cloudflare) redirects all HTTP traffic to HTTPS.
- [ ] **Strict CORS Whitelist:** `corsConfigurationSource` whitelists only designated corporate client domains. No wildcard `*` origins allowed when credentials are true.
- [ ] **Database Connection Security:** Supabase connection string specifies `sslmode=require` or `sslmode=verify-full`.
- [ ] **Security Headers Configured:** Ingress proxy serves:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 9. Phase 8: Logging, Auditability & Error Handling

- [ ] **Sanitized Application Logs:** Logs never print passwords, JWT tokens, OAuth tokens, or database connection strings.
- [ ] **Standardized Error Payloads:** Unhandled exceptions return RFC 7807 problem payloads; internal Java stack traces are suppressed in production.
- [ ] **Certificate Non-Repudiation:** Issued certificates persist a unique serial number (`FM-CERT-YYYY-XXXX`), recipient ID, course ID, and issue timestamp.
- [ ] **Quiz Submission Audit Trail:** Quiz attempts log start time, submission time, duration, and question response maps.
- [ ] **Public Verification Safety:** The certificate verification endpoint confirms certificate validity without exposing personal contact details or HR records.

---

## 10. Phase 9: Automated Verification Commands

Run the following terminal commands to verify security readiness prior to production deployment:

### 10.1 Audit Frontend Dependencies for Vulnerabilities
```bash
cd frontend
npm audit --audit-level=high
```

### 10.2 Audit Backend Java Dependencies
```bash
cd backend
mvn dependency-check:check
```

### 10.3 Scan Repository for Committed Secrets
```bash
# Check if any sensitive keyword appears in git tracking
git grep -i "password\s*="
git grep -i "secret\s*="
```

### 10.4 Verify Ignored Status of Sensitive Artifacts
```bash
# Verify that backups and upload dumps are not tracked
git status --ignored
```

### 10.5 Execute Backend Security Test Suite
```bash
cd backend
mvn test -Dtest=*Security*
```

---

## 11. Phase 10: Security Sign-Off & Deployment Approval

| Review Role | Reviewer Name | Signature / Sign-Off Date | Status |
|---|---|---|:---:|
| **Lead Backend Engineer** | ____________________ | ____ / ____ / 2026 | [ ] Approved |
| **Lead Frontend Engineer** | ____________________ | ____ / ____ / 2026 | [ ] Approved |
| **Application Security Officer**| ____________________ | ____ / ____ / 2026 | [ ] Approved |
| **DevOps / Infrastructure Lead**| ____________________ | ____ / ____ / 2026 | [ ] Approved |

> **Deployment Gate:** All approval checkboxes must be marked before executing production CI/CD deployments.
