# Fairmacs KMS — Backend Service Architecture & Operations Guide

**Spring Boot 3.2.0** enterprise backend powering the **Fairmacs Knowledge Management System (KMS)**, managing corporate employee onboarding, course curriculum authoring, automated assessments, OpenPDF credential generation, Corporate Policies & SOP Agreements governance, and third-party Zoho cloud integrations.

---

## 📑 Table of Contents
1. [Core Technology Stack](#1-core-technology-stack)
2. [Prerequisites & System Requirements](#2-prerequisites--system-requirements)
3. [Environment Configuration](#3-environment-configuration)
4. [Local Development Setup](#4-local-development-setup)
5. [Docker Containerization & Render Deployment](#5-docker-containerization--render-deployment)
6. [Project Structure & Package Layout](#6-project-structure--package-layout)
7. [Subsystems & Core Modules](#7-subsystems--core-modules)
8. [Comprehensive REST API Reference](#8-comprehensive-rest-api-reference)
9. [Automated Verification & Test Suites](#9-automated-verification--test-suites)
10. [Security & Compliance Governance](#10-security--compliance-governance)

---

## 1. Core Technology Stack

- **Framework:** Spring Boot 3.2.0 (Spring Framework 6.1.1)
- **Runtime:** Java 17 (Eclipse Temurin)
- **Persistence & ORM:** Spring Data JPA / Hibernate 6.x
- **Database Engine:** PostgreSQL (Supabase Cloud with SSL & Connection Pooling)
- **Database Migrations:** Flyway 10.x
- **Security & RBAC:** Spring Security 6 with JJWT (io.jsonwebtoken 0.11.5)
- **Document & PDF Generation:** OpenPDF 1.3.39 (iText fork) with Dynamic Rotated Watermarking
- **Office Document Processing:** Apache POI 5.4.1 / POI-OOXML (Excel batch imports & styled policy reports)
- **Cloud Document Storage:** Zoho WorkDrive REST API (OAuth 2.0 with AES-256-GCM token encryption)
- **Transactional Notifications:** Zoho ZeptoMail REST API / HTTPS delivery
- **Containerization:** Multi-stage Docker build with non-root security execution

---

## 2. Prerequisites & System Requirements

- **JDK:** Java Development Kit 17 or higher
- **Build Tool:** Apache Maven 3.9+
- **Database:** PostgreSQL 15+ (Local or Supabase cloud instance)
- **Memory Allocation:** Minimum 512 MB RAM (configured for small container profiles)

---

## 3. Environment Configuration

All configuration is externalized via environment variables and resolved in `src/main/resources/application.properties`.

### Required Variables (Mandatory — App will not start without these)

```bash
# PostgreSQL Connection (Supabase with SSL)
export SUPABASE_DB_URL=jdbc:postgresql://<host>:5432/<database>?sslmode=require
export SUPABASE_DB_USERNAME=<db-username>
export SUPABASE_DB_PASSWORD=<db-password>

# JWT Secret (>= 32 bytes cryptographically random string)
export JWT_SECRET=fairmacs_ci_test_secret_for_jwt_tokens_256bit_key_abcdef1234567890
```

### Operational & Deployment Variables (Optional with Production Defaults)

```bash
# Server Port (Render and container hosts inject PORT automatically; defaults to 8080)
export PORT=8080

# CORS Whitelist (Comma-separated client origins)
export CORS_ALLOWED_ORIGINS=https://lms.fairmacs.com,http://localhost:5173

# Frontend Public URL (Used in notification email deep links)
export FRONTEND_BASE_URL=https://lms.fairmacs.com

# Zoho Cloud OAuth Integration
export ZOHO_CLIENT_ID=<your-zoho-client-id>
export ZOHO_CLIENT_SECRET=<your-zoho-client-secret>
export ZOHO_TOKEN_ENCRYPTION_KEY=<32-byte-base64-encryption-key>
export ZOHO_REDIRECT_URI=https://fairmacs-lms-api.onrender.com/api/integrations/zoho/callback

# Transactional Email Notification Channel (ZeptoMail)
export NOTIFICATION_EMAIL_ENABLED=false
export ZEPTOMAIL_API_URL=https://api.zeptomail.in/v1.1/email
export ZEPTOMAIL_SEND_TOKEN=Zoho-enczapikey <your-token>
export NOTIFICATION_EMAIL_FROM=no-reply@fairmacs.com
export NOTIFICATION_EMAIL_FROM_NAME="Fairmacs Learning Hub"
```

---

## 4. Local Development Setup

### 4.1 Clone and Build
```bash
cd backend
mvn clean install -DskipTests
```

### 4.2 Run Locally
```bash
# Set required environment variables
export SUPABASE_DB_URL=jdbc:postgresql://localhost:5432/fairmacs_lms
export SUPABASE_DB_USERNAME=postgres
export SUPABASE_DB_PASSWORD=postgres
export JWT_SECRET=local_development_secret_key_minimum_256_bits_length!!

mvn spring-boot:run
```
The API starts on `http://localhost:8080/api`.

---

## 5. Docker Containerization & Render Deployment

### 5.1 Multi-Stage Dockerfile Architecture (`backend/Dockerfile`)
The backend uses a production-hardened multi-stage Docker build:
- **Build Stage:** `maven:3.9-eclipse-temurin-17` resolves dependencies offline and compiles the thin JAR.
- **Run Stage:** `eclipse-temurin:17-jre` creates a non-root system user (`app:app`, UID 1001), limits JVM heap usage to small 512 MB instances (`-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k`), and listens on the host-injected `$PORT`.

### 5.2 Build and Run Docker Container Locally
```bash
# Build the image
docker build -t fairmacs-lms-backend backend/

# Run the container
docker run -p 8080:8080 \
  -e SUPABASE_DB_URL="jdbc:postgresql://..." \
  -e SUPABASE_DB_USERNAME="..." \
  -e SUPABASE_DB_PASSWORD="..." \
  -e JWT_SECRET="..." \
  -e PORT=8080 \
  fairmacs-lms-backend
```

### 5.3 Render Blueprint (`render.yaml`)
Fairmacs KMS deploys as a coordinated dual-service application on Render:
1. `fairmacs-lms-api`: Docker runtime web service with automatic health checks and secret synchronization (`sync: false`).
2. `fairmacs-lms-web`: Static web service running Node 22, building with `npm ci && npm run build`, publishing `dist`, and enforcing client-side React Router rewrites (`/*` -> `/index.html`).

---

## 6. Project Structure & Package Layout

```
backend/
├── src/main/java/com/fairmacs/lms/
│   ├── FairmacsLmsApplication.java        # Spring Boot entry point
│   ├── config/                            # JPA, Security, Flyway, and Seed Initializers
│   │   ├── DataInitializer.java           # Initial test users and roles
│   │   ├── DepartmentDataInitializer.java # Fairmacs operational divisions
│   │   ├── LMSDataInitializer.java        # Core curriculum and initial lessons
│   │   └── SecurityConfig.java            # Spring Security 6 filter chain & CORS
│   ├── controller/                        # REST API Controllers (Role-scoped)
│   │   ├── AuthController.java            # Login, password reset, profile
│   │   ├── CertificateController.java     # Credential generation & verification
│   │   ├── CourseAssignmentController.java# Assignment engine & revocations
│   │   ├── CourseController.java          # Catalog, curriculum, and lessons
│   │   ├── DepartmentController.java      # Divisional metrics and drilldowns
│   │   ├── DraftController.java           # Course builder authoring drafts
│   │   ├── HrAdminController.java         # Organization metrics, users, reports
│   │   ├── ManagerReportController.java   # Team supervision & compliance tracking
│   │   ├── PolicyHrController.java        # Policy authoring, publishing, analytics
│   │   ├── PolicyManagerController.java   # Manager department policy supervision
│   │   ├── PolicyPublicController.java    # Employee policy viewing & acknowledgements
│   │   ├── QuizController.java            # Timed assessment engine
│   │   └── ZohoOAuthController.java       # Zoho cloud storage integration
│   ├── dto/                               # Typed Request and Response DTOs
│   ├── entity/                            # JPA Entities & Enums (PostgreSQL tables)
│   ├── exception/                         # Global exception advice & problem details
│   ├── repository/                        # Spring Data JPA Repositories
│   ├── security/                          # JWT filter, token provider, principal models
│   └── service/                           # Core Domain Services & Business Logic
│       ├── CourseAuthoringService.java    # Curriculum builder & draft orchestration
│       ├── DepartmentService.java         # Divisional rollups and employee aggregations
│       ├── EnrollmentService.java         # Learning engine, tracking, and cascading
│       ├── HrAdminService.java            # Organization KPIs and departmental stats
│       ├── PolicyService.java             # Policy lifecycle, audiences, acknowledgements
│       ├── PolicyWatermarkService.java    # OpenPDF non-clipping rotated watermarking
│       ├── QuizService.java               # Assessment grading, retakes, and attempts
│       └── ZohoWorkDriveService.java      # Cloud document storage & streaming
└── src/main/resources/
    ├── application.properties             # Externalized production configuration
    ├── db/migration/                      # Flyway SQL schema and seed scripts
    └── fairmacs-default-thumbnail.png     # Fallback course branding asset
```

---

## 7. Subsystems & Core Modules

### 7.1 Corporate Policies & SOP Agreements Engine
- **Targeting Audiences:** Company-wide, department-specific, role-specific, or individually designated.
- **Lifecycle:** Draft -> Under Review -> Published -> Archived with version history tracking.
- **Explicit Acknowledgement:** Tamper-evident acknowledgements recording employee ID, digital signature, client IP address, and timestamp.
- **Exporting:** High-fidelity multi-tab Excel reports (`PolicyReportExportService`) generated via Apache POI.

### 7.2 Dynamic Rotated Watermark Engine (`PolicyWatermarkService`)
- Dynamically stamps confidential documents streamed through OpenPDF.
- High-fidelity rotated text (`PROPERTY OF FAIRMACS SHIPPING & LOGISTICS — CONFIDENTIAL — EMPLOYEE_NAME — TIMESTAMP`).
- Strict non-clipping boundary check guarantees watermark stays entirely within printable page margins across Letter and A4 portrait/landscape formats.

### 7.3 Learning & Compliance Calendar Engine
- Timezone-safe date normalization (`calendarService.js` / API).
- Unified event tracking across live training sessions, course due dates, policy deadlines, and scheduled quizzes.
- Strict policy deadline rule: Open-ended policies without due dates are never rendered as overdue calendar tasks.

### 7.4 Divisional Training Analytics Subsystem
- Computes workforce divisional progress for active employees by operational division.
- Accurately tracks employee completion rates and curriculum duration estimates.

---

## 8. Comprehensive REST API Reference

### 8.1 Authentication & Profile (`/api/auth`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and issue signed JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile and permissions |
| `POST` | `/api/auth/change-password` | Authenticated | Change current user password with verification |

### 8.2 Corporate Policies & SOPs (`/api/policies`, `/api/hr/policies`, `/api/manager/policies`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/policies/my-assignments` | Authenticated | Retrieve policies assigned to current user |
| `POST` | `/api/policies/assignments/{id}/acknowledge` | Authenticated | Submit explicit employee acknowledgement |
| `GET` | `/api/policies/{id}/stream` | Authenticated | Stream dynamically watermarked PDF document |
| `GET` | `/api/manager/policies/overview` | Manager | Department-scoped compliance overview |
| `POST` | `/api/manager/policies/assignments/{id}/remind`| Manager | Send escalation reminder to employee |
| `GET` | `/api/manager/policies/reports/departments/export`| Manager | Export department policy compliance to Excel |
| `POST` | `/api/hr/policies` | HR Admin | Create new corporate policy or SOP draft |
| `POST` | `/api/hr/policies/{id}/publish` | HR Admin | Publish policy version with audience targeting |
| `GET` | `/api/hr/policies/assignments/export` | HR Admin | Export organization-wide policy audit to Excel |

### 8.3 Course Management & Authoring (`/api/courses`, `/api/drafts`, `/api/course-assignments`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/courses` | Authenticated | List published courses filtered by category/level |
| `GET` | `/api/courses/{id}` | Authenticated | Retrieve full course details, modules, and lessons |
| `POST` | `/api/courses` | HR Admin, Trainer | Create or publish completed course curriculum |
| `DELETE`| `/api/courses/{id}` | HR Admin | Delete course record and cascade assignments |
| `POST` | `/api/course-assignments` | HR Admin, Trainer | Assign course to employees with optional due date |
| `DELETE`| `/api/course-assignments/{id}/employees/{userId}`| HR Admin | Soft-revoke course assignment |
| `GET` | `/api/drafts` | HR Admin, Trainer | Retrieve authoring drafts in progress |

### 8.4 Quizzes & Assessments (`/api/assessments`, `/api/quizzes`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/assessments/course/{courseId}` | Authenticated | Get course quiz and questions |
| `POST` | `/api/assessments/{id}/submit` | Authenticated | Submit quiz attempt and calculate score |
| `GET` | `/api/quizzes/{quizId}/progress` | Authenticated | Check employee quiz attempt history and cooldown |

### 8.5 Certificates & Credentials (`/api/certificates`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/certificates/{id}/download` | Authenticated | Download verified PDF certificate with digital seal |
| `GET` | `/api/certificates/verify/{certNumber}` | Public | Verify certificate authenticity via registry |
| `GET` | `/api/certificates/recent` | HR Admin, Manager | List recently awarded organization credentials |

### 8.6 HR Administration & Reporting (`/api/hr`, `/api/reports`)
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/hr/dashboard/metrics` | HR Admin | Organization training KPIs and department stats |
| `GET` | `/api/hr/employees` | HR Admin | List workforce members and statuses |
| `POST` | `/api/hr/employees/import` | HR Admin | Batch import employees via Excel spreadsheet |
| `GET` | `/api/reports/manager/team-summary` | Manager | Scoped team compliance and completion report |

---

## 9. Automated Verification & Test Suites

The backend contains extensive unit, integration, and security verification suites:

```bash
# Run all backend test suites
cd backend
mvn test

# Run specific integration audit suites
mvn test -Dtest=PolicyBackendIntegrationTest
mvn test -Dtest=Phase1SecurityHardeningTest
mvn test -Dtest=HrAdminDepartmentAnalyticsTest
```

---

## 10. Security & Compliance Governance

- **Zero-Credential-in-Code Policy:** All secrets (`JWT_SECRET`, database passwords, Zoho tokens) are loaded from runtime environment variables.
- **Container Isolation:** The production container runs under unprivileged UID 1001 with restricted system capabilities.
- **Stateless Bearer Tokens:** Scalable authorization token validation without server-side session overhead.
- **Tamper-Resistant Logs:** Critical administrative actions, policy agreements, and quiz evaluations produce immutable database audit entries.
