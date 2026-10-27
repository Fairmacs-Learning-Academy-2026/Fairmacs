# Fairmacs LMS — Security Requirements Specification

**Document Reference:** SEC-REQ-v1.0  
**Classification:** Internal Corporate Security Standard  
**Compliance Frameworks:** OWASP Top 10 (2021), ISO/IEC 27001:2022, GDPR / DPDP Act  
**Target Application:** Fairmacs Enterprise Learning Management System

---

## 📑 Table of Contents
1. [Executive Summary & Security Objectives](#1-executive-summary--security-objectives)
2. [Standards & Regulatory Alignment](#2-standards--regulatory-alignment)
3. [Security Requirements Classification Matrix](#3-security-requirements-classification-matrix)
4. [Authentication & Credential Management (SR-AUTH)](#4-authentication--credential-management-sr-auth)
5. [Role-Based Access Control & Authorization (SR-RBAC)](#5-role-based-access-control--authorization-sr-rbac)
6. [Data Protection & Cryptography (SR-CRYPTO)](#6-data-protection--cryptography-sr-crypto)
7. [Input Validation & Injection Prevention (SR-INPUT)](#7-input-validation--injection-prevention-sr-input)
8. [File Ingestion & Document Processing Security (SR-UPLOAD)](#8-file-ingestion--document-processing-security-sr-upload)
9. [Third-Party Cloud Integration Security (SR-INTEG)](#9-third-party-cloud-integration-security-sr-integ)
10. [Audit Logging & Non-Repudiation (SR-AUDIT)](#10-audit-logging--non-repudiation-sr-audit)
11. [Data Privacy & Lifecycle Governance (SR-PRIV)](#11-data-privacy--lifecycle-governance-sr-priv)
12. [Verification & Acceptance Criteria](#12-verification--acceptance-criteria)

---

## 1. Executive Summary & Security Objectives

Fairmacs LMS is an enterprise training platform managing corporate intellectual property, employee competencies, regulatory compliance certifications, and human resource records. The core security objectives are:

1. **Confidentiality:** Prevent unauthorized disclosure of proprietary training materials, employee transcripts, and sensitive credentials.
2. **Integrity:** Ensure examinations, grading, compliance records, and issued PDF certificates cannot be forged, manipulated, or bypassed.
3. **Availability:** Protect corporate learning operations from denial-of-service, resource exhaustion, and corrupted spreadsheet ingestion.
4. **Accountability & Non-Repudiation:** Maintain tamper-resistant audit trails for certification issuance, quiz attempts, and administrative role assignments.

---

## 2. Standards & Regulatory Alignment

| Standard / Framework | Application in Fairmacs LMS |
|---|---|
| **OWASP Top 10 (2021)** | Primary benchmark for Broken Access Control (A01), Cryptographic Failures (A02), Injection (A03), Insecure Design (A04), Security Misconfiguration (A05), and Vulnerable Components (A06). |
| **ISO/IEC 27001 Control A.9 / A.10** | Access control management, password salting, cryptographic key handling, and encryption at rest. |
| **Corporate Compliance Auditing** | Verifiable certificate IDs and tamper-proof training records required for maritime and aviation freight regulatory audits. |

---

## 3. Security Requirements Classification Matrix

Each requirement is tagged with a unique identifier and categorized according to RFC 2119 priority:
- **MUST / SHALL:** Mandatory for production operation.
- **SHOULD:** Strongly recommended best practice.
- **MAY:** Optional or future enhancement.

| Category ID | Scope | Mandatory Requirements Count |
|---|---|:---:|
| `SR-AUTH` | Authentication, Sessions, Password Hygiene | 6 |
| `SR-RBAC` | Authorization, Method-Level Access, Multi-Tenancy | 5 |
| `SR-CRYPTO` | Transit / Rest Encryption, Secret Storage | 4 |
| `SR-INPUT` | Input Filtering, XSS, SQLi Defense | 4 |
| `SR-UPLOAD` | File Parsing, POI Excel Security, Size Limits | 5 |
| `SR-INTEG` | Zoho WorkDrive Cloud OAuth, Token Protection | 4 |
| `SR-AUDIT` | Immutable Trails, Certificate Non-Repudiation | 4 |
| `SR-PRIV` | PII Governance, Account Separation | 3 |

---

## 4. Authentication & Credential Management (SR-AUTH)

- **SR-AUTH-01 (Password Hashing):** All user passwords **MUST** be hashed before persistence using the **BCrypt** algorithm with a minimum cost factor of 10 (`BCryptPasswordEncoder`). Plaintext passwords must never be stored, logged, or serialized.
- **SR-AUTH-02 (Stateless JWT Tokens):** Client authentication **MUST** use stateless JSON Web Tokens (JWT) signed via HMAC-SHA-256 (`HS256`) using a cryptographic key of at least 256 bits (`JWT_SECRET`).
- **SR-AUTH-03 (Token Expiration):** Issued JWT access tokens **MUST** enforce a strict expiration threshold not exceeding 24 hours (`86,400,000 ms`).
- **SR-AUTH-04 (Account Status Invalidation):** During token validation in `JwtAuthenticationFilter`, the backend **MUST** verify that the associated employee account exists and does not carry a `TERMINATED` or `INACTIVE` lifecycle status. Terminated users must be immediately rejected with `401 Unauthorized`.
- **SR-AUTH-05 (Password Reset Integrity):** Administrative password resets executed by HR Admins **MUST** enforce initial password change upon subsequent login, requiring current password verification before committing changes.
- **SR-AUTH-06 (No Password Leakage):** API response DTOs, audit logs, and exception tracebacks **MUST NEVER** include password fields or hashes.

---

## 5. Role-Based Access Control & Authorization (SR-RBAC)

- **SR-RBAC-01 (Strict Method Authorization):** All administrative and trainer mutation endpoints **MUST** enforce Spring Security `@PreAuthorize("hasRole(...)")` checks:
  - `HR_ADMIN`: Employee creation, bulk import, department management, global course assignments.
  - `TRAINER`: Curriculum authoring, module/lesson edits, draft publishing.
  - `MANAGER`: Team transcript drilldowns, team compliance oversight.
  - `EMPLOYEE`: Personal dashboard, course enrollment, personal quiz execution.
- **SR-RBAC-02 (Horizontal Privilege Enforcement - IDOR Defense):** A Manager **MUST ONLY** access training transcripts for employees within their assigned reporting line or department. Cross-departmental unauthorized IDOR inspection must be rejected with `403 Forbidden`.
- **SR-RBAC-03 (Server-Authoritative Quiz Evaluation):** Quiz questions and options sent to the browser **MUST NOT** include answer keys or grading booleans. Quiz scores **MUST** be computed exclusively on the backend.
- **SR-RBAC-04 (Curriculum Access Control):** Unpublished course drafts **MUST NOT** be accessible via the public or employee course catalog.
- **SR-RBAC-05 (Default Deny Stance):** In `SecurityConfig.java`, all API paths not explicitly declared as public (`/api/auth/**`, `/api/certificates/verify/**`, `/api/integrations/zoho/callback`) **MUST** require authentication (`anyRequest().authenticated()`).

---

## 6. Data Protection & Cryptography (SR-CRYPTO)

- **SR-CRYPTO-01 (TLS Enforcement in Transit):** All client-to-server and server-to-database communications **MUST** enforce TLS 1.2 or TLS 1.3 encryption. Unencrypted HTTP must be redirected or rejected.
- **SR-CRYPTO-02 (OAuth Token Encryption at Rest):** Third-party refresh tokens (specifically Zoho WorkDrive OAuth refresh tokens) stored in the `zoho_oauth_tokens` table **MUST** be encrypted at rest using **AES-256-GCM** with a dynamic, cryptographically secure 12-byte initialization vector (IV) per entry.
- **SR-CRYPTO-03 (Zero-Credential Repository Rule):** Source code committed to version control **MUST NOT** contain database passwords, API keys, JWT secret keys, or private certificates. All sensitive values must be injected via runtime environment variables.
- **SR-CRYPTO-04 (Database Connection Security):** PostgreSQL connections to Supabase **MUST** require `sslmode=require` or `sslmode=verify-full`.

---

## 7. Input Validation & Injection Prevention (SR-INPUT)

- **SR-INPUT-01 (SQL Injection Immunity):** All database operations **MUST** use Spring Data JPA repository query abstractions or parameterized prepared statements. Raw dynamic string concatenation in SQL queries is strictly prohibited.
- **SR-INPUT-02 (Cross-Site Scripting - XSS Defense):** All user-supplied HTML/rich text rendered in the React client **MUST** be sanitized (using DOMPurify where dynamic HTML is required) or rendered as safe text nodes.
- **SR-INPUT-03 (Path Traversal Prevention):** Document download and streaming controllers (`LessonDocumentController`) **MUST** validate file identifiers and ensure file retrieval paths cannot navigate outside authorized storage directories.
- **SR-INPUT-04 (Data Format Validation):** Email addresses, employee IDs, dates, and course identifiers **MUST** be validated against strict regex patterns prior to database persistence.

---

## 8. File Ingestion & Document Processing Security (SR-UPLOAD)

- **SR-UPLOAD-01 (Maximum Upload Ceiling):** Multipart file uploads **MUST** enforce a strict upper size limit of **10MB** (`spring.servlet.multipart.max-file-size=10MB`).
- **SR-UPLOAD-02 (MIME Type & Extension Whitelisting):** Document uploads for courses **MUST ONLY** accept validated PDF (`application/pdf`) and Word (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`) formats.
- **SR-UPLOAD-03 (Apache POI Spreadsheet Hardening):** The Excel bulk import service (`EmployeeExcelImportService`) **MUST**:
  - Mitigate XML External Entity (XXE) injection by disabling external DTD resolution.
  - Guard against Zip-Bomb / Billion Laughs attacks by limiting uncompressed memory thresholds.
  - Sanitize spreadsheet cell values to prevent CSV/Excel Formula Injection (`=`, `+`, `-`, `@` leading characters).
- **SR-UPLOAD-04 (Isolated Upload Storage):** Uploaded files and generated PDF certificates **MUST NOT** be stored in publicly browsable web root directories.
- **SR-UPLOAD-05 (Git Exclusion of User Content):** Upload folders (`backend/uploads/`) and database dumps (`backups/`) **MUST** be permanently excluded in `.gitignore`.

---

## 9. Third-Party Cloud Integration Security (SR-INTEG)

- **SR-INTEG-01 (OAuth 2.0 State Verification):** The Zoho OAuth flow **MUST** generate a cryptographically random `state` nonce stored in memory with an expiration TTL. Upon callback, the returned state must match before code exchange proceeds.
- **SR-INTEG-02 (Credential Proxying):** Frontend clients **MUST NEVER** directly communicate with the Zoho WorkDrive API using Zoho access tokens. All downloads, streams, and uploads must be proxied through the backend.
- **SR-INTEG-03 (Failure Isolation):** Transient outages or authorization errors from external services like Zoho WorkDrive **MUST NOT** crash the core LMS or expose raw cloud provider stack traces to the end user.
- **SR-INTEG-04 (Automated Token Refresh):** Access tokens **MUST** be automatically refreshed using the encrypted refresh token before expiration, without requiring manual administrative intervention.

---

## 10. Audit Logging & Non-Repudiation (SR-AUDIT)

- **SR-AUDIT-01 (Tamper-Resistant Certificate Identifiers):** Every issued certificate **MUST** carry a unique, sequential or pseudorandom serial number (e.g., `FM-CERT-YYYY-XXXX`) logged in the database alongside user ID, course ID, completion timestamp, and exam score.
- **SR-AUDIT-02 (Public Verification Endpoint):** The certificate verification endpoint (`/api/certificates/verify/{certNumber}`) **MUST** provide public confirmation of validity without disclosing employee personal contact details or sensitive HR records.
- **SR-AUDIT-03 (Quiz Attempt Records):** Every quiz submission **MUST** permanently store the start timestamp, submission timestamp, question response map, final score, and passing verdict.
- **SR-AUDIT-04 (Sanitized Log Output):** Backend logs (`application.log`) **MUST NEVER** output OAuth access/refresh tokens, user passwords, or cryptographic secret keys.

---

## 11. Data Privacy & Lifecycle Governance (SR-PRIV)

- **SR-PRIV-01 (Employee Lifecycle Governance):** When an employee transitions to `TERMINATED` or `INACTIVE`, all active authentication tokens must be rejected, and course enrollments must be preserved for compliance audit purposes without allowing further interactive logins.
- **SR-PRIV-02 (Minimal Data Exposure):** User search endpoints for Trainers and Employees **MUST ONLY** expose necessary public fields (Name, Department, Avatar, Employee ID) and hide sensitive HR fields (salary, personal address, private phone numbers).
- **SR-PRIV-03 (Database Backup Encryption):** All offline database snapshots or backup dumps must be encrypted using AES-256 and stored in restricted corporate backup locations.

---

## 12. Verification & Acceptance Criteria

| Requirement ID | Verification Test Method | Acceptance Pass Criteria |
|---|---|---|
| `SR-AUTH-01` | Automated Unit Test | Database `users.password` column contains standard `$2a$` BCrypt prefix; original plaintext does not match. |
| `SR-AUTH-04` | Integration Test | Attempting to access `/api/courses` with a valid JWT for an `INACTIVE` user returns HTTP 401. |
| `SR-RBAC-01` | Role Authorization Test | Sending `POST /api/courses/authoring/create` with an `EMPLOYEE` JWT returns HTTP 403. |
| `SR-CRYPTO-02`| Database Inspection | Table `zoho_oauth_tokens.refresh_token_encrypted` contains ciphertext; plaintext token is unreadable. |
| `SR-INPUT-01` | Dynamic Security Test | Injection payloads (`' OR 1=1 --`) in search query params return 0 results or 400 Bad Request without SQL errors. |
| `SR-UPLOAD-01`| Upload Boundary Test | Uploading an 11MB file to `/api/integrations/zoho/documents/upload` is rejected with `MaxUploadSizeExceededException`. |
| `SR-INTEG-01` | OAuth State Test | Calling `/api/integrations/zoho/callback` with an unknown `state` parameter returns HTTP 400. |
| `SR-AUDIT-01` | Certificate Verification | Valid certificate number query returns `valid: true`; manipulated number returns `valid: false` (404). |
