# Fairmacs KMS — REST API Reference & Developer Guide

**Base URL (Local Dev):** `http://localhost:8080/api`  
**Base URL (Production on Render):** `https://fairmacs-lms-api.onrender.com/api`  
**Protocol:** HTTPS / JSON over REST  
**Authentication:** Bearer Token (JSON Web Token - RFC 7519)

---

## 📑 Table of Contents
1. [Authentication & Request Headers](#1-authentication--request-headers)
2. [Standard Response & Error Formats](#2-standard-response--error-formats)
3. [Authentication & Profile Endpoints](#3-authentication--profile-endpoints)
4. [Course Catalog & Curriculum Endpoints](#4-course-catalog--curriculum-endpoints)
5. [Course Authoring & Drafts Endpoints](#5-course-authoring--drafts-endpoints)
6. [Course Assignment Engine Endpoints](#6-course-assignment-engine-endpoints)
7. [Enrollments & Learning Progress Endpoints](#7-enrollments--learning-progress-endpoints)
8. [Quizzes & Assessment Engine Endpoints](#8-quizzes--assessment-engine-endpoints)
9. [Certificates & Verification Endpoints](#9-certificates--verification-endpoints)
10. [Corporate Policies & SOP Agreements Endpoints](#10-corporate-policies--sop-agreements-endpoints)
11. [Department Management & Course Matrix Endpoints](#11-department-management--course-matrix-endpoints)
12. [HR Administration & Employee Management Endpoints](#12-hr-administration--employee-management-endpoints)
13. [Manager Team Supervision & Reports Endpoints](#13-manager-team-supervision--reports-endpoints)
14. [Learning & Compliance Calendar Endpoints](#14-learning--compliance-calendar-endpoints)
15. [Dynamic Rotated Watermark Streaming Endpoints](#15-dynamic-rotated-watermark-streaming-endpoints)
16. [Zoho WorkDrive Cloud Integration Endpoints](#16-zoho-workdrive-cloud-integration-endpoints)
17. [Notification Center Endpoints](#17-notification-center-endpoints)
18. [Reporting & Styled Excel Export Endpoints](#18-reporting--styled-excel-export-endpoints)

---

## 1. Authentication & Request Headers

All endpoints under `/api` (except public endpoints such as `/api/auth/login`, `/api/certificates/verify/{certNumber}`, and `/api/integrations/zoho/callback`) require an HTTP `Authorization` header containing a valid Bearer token:

```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
Accept: application/json
```

---

## 2. Standard Response & Error Formats

### 2.1 Success Response Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... }
}
```

### 2.2 Error Response Format (RFC 7807 Problem Details)
```json
{
  "timestamp": "2026-11-25T07:15:00.120Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid employee email format.",
  "path": "/api/hr/employees"
}
```

---

## 3. Authentication & Profile Endpoints

### 3.1 Authenticate & Obtain JWT
- **Route:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "employee@fairmacs.com",
    "password": "Password@123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 104,
      "employeeId": "DEV-EMP01",
      "name": "Jane Doe",
      "email": "employee@fairmacs.com",
      "role": "EMPLOYEE",
      "department": "Operations",
      "designation": "Operations Coordinator"
    }
  }
  ```

### 3.2 Get Current User Profile
- **Route:** `GET /api/auth/me`
- **Access:** Authenticated
- **Response `200 OK`:** Profile entity with role, department, level, and active status.

### 3.3 Change Password
- **Route:** `POST /api/auth/change-password`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword@123",
    "newPassword": "NewSecurePassword@2026"
  }
  ```

---

## 4. Course Catalog & Curriculum Endpoints

### 4.1 List Active Published Courses
- **Route:** `GET /api/courses`
- **Access:** Authenticated
- **Query Params:** `category`, `level`, `search`

### 4.2 Get Course Details by ID
- **Route:** `GET /api/courses/{courseId}`
- **Access:** Authenticated
- **Response `200 OK`:** Complete course syllabus, ordered modules, lessons, and assessment metadata.

### 4.3 Update Course Status (Publish / Archive)
- **Route:** `PATCH /api/courses/{courseId}/status`
- **Access:** `HR_ADMIN`, `TRAINER`
- **Request Body:**
  ```json
  {
    "active": true
  }
  ```

---

## 5. Course Authoring & Drafts Endpoints

### 5.1 Create / Update Course Draft
- **Route:** `POST /api/drafts`
- **Access:** `HR_ADMIN`, `TRAINER`
- **Request Body:** Serialized 5-step curriculum JSON wizard payload including modules, lessons, quiz schema, and target departments.

### 5.2 Retrieve In-Progress Drafts
- **Route:** `GET /api/drafts`
- **Access:** `HR_ADMIN`, `TRAINER`

### 5.3 Publish Draft Course
- **Route:** `POST /api/drafts/{id}/publish`
- **Access:** `HR_ADMIN`, `TRAINER`
- **Response `200 OK`:** Published Course DTO with resolved unique course code and department cascade.

---

## 6. Course Assignment Engine Endpoints

### 6.1 Assign Course to Specific Employees
- **Route:** `POST /api/course-assignments`
- **Access:** `HR_ADMIN`, `TRAINER`
- **Request Body:**
  ```json
  {
    "courseId": 12,
    "courseCode": "OP005",
    "employeeIds": [101, 104, 108],
    "dueDate": "2026-12-15",
    "assignmentType": "MANDATORY"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "assignedCount": 3,
    "message": "3 employee(s) assigned or restored successfully."
  }
  ```

### 6.2 Get Currently Assigned Employees for Course
- **Route:** `GET /api/course-assignments/{courseId}`
- **Access:** `HR_ADMIN`, `TRAINER`
- **Response `200 OK`:** Array of enrolled active learners with progress percentages and assignment type.

### 6.3 Soft-Revoke Employee Course Access
- **Route:** `DELETE /api/course-assignments/{courseId}/employees/{userId}`
- **Access:** `HR_ADMIN`, `TRAINER`
- **Response `200 OK`:** Confirms access revocation while strictly preserving all historical lesson completions and scores.

### 6.4 Assign Course to Department
- **Route:** `POST /api/enrollments/assign-department`
- **Access:** `HR_ADMIN`, `TRAINER`
- **Request Body:**
  ```json
  {
    "courseId": 12,
    "departmentId": 4,
    "assignmentType": "MANDATORY",
    "dueDate": "2026-12-31"
  }
  ```

---

## 7. Enrollments & Learning Progress Endpoints

### 7.1 Get User Learning Dashboard
- **Route:** `GET /api/enrollments/dashboard`
- **Access:** Authenticated
- **Response `200 OK`:** Contains active enrollments, completed courses, progress percentages, and due dates.

### 7.2 Toggle Lesson Completion
- **Route:** `POST /api/enrollments/{enrollmentId}/lessons/{lessonId}/complete`
- **Access:** Authenticated
- **Response `200 OK`:** Updated enrollment progress percentage and course completion state.

---

## 8. Quizzes & Assessment Engine Endpoints

### 8.1 Get Quiz for Course
- **Route:** `GET /api/quizzes/course/{courseId}`
- **Access:** Authenticated (Answer keys strictly stripped)
- **Response `200 OK`:** Time limit, passing threshold (default 80%), and questions.

### 8.2 Submit Quiz Attempt
- **Route:** `POST /api/quizzes/{quizId}/submit`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "answers": {
      "q1": "B",
      "q2": "A"
    }
  }
  ```
- **Response `200 OK`:** Calculated score, pass/fail status, and generated certificate ID if passed.

---

## 9. Certificates & Verification Endpoints

### 9.1 Verify Certificate (Public Registry)
- **Route:** `GET /api/certificates/verify/{certificateNumber}`
- **Access:** Public
- **Response `200 OK`:**
  ```json
  {
    "authentic": true,
    "certificateNumber": "CERT-OP-2026-0042",
    "courseTitle": "Maritime Hazardous Cargo Handling",
    "employeeName": "Jane Doe",
    "issuedAt": "2026-11-20T10:30:00Z"
  }
  ```

### 9.2 Download Official PDF Certificate
- **Route:** `GET /api/certificates/{certificateId}/download`
- **Access:** Authenticated
- **Response:** PDF binary stream generated with OpenPDF, corporate digital seal, and tamper-resistant certificate ID.

---

## 10. Corporate Policies & SOP Agreements Endpoints

### 10.1 Get Authenticated User's Assigned Policies
- **Route:** `GET /api/policies/my-assignments`
- **Access:** Authenticated
- **Response `200 OK`:** Assigned policies, version numbers, compliance status (`PENDING` or `ACKNOWLEDGED`), and due dates.

### 10.2 Submit Explicit Employee Acknowledgement
- **Route:** `POST /api/policies/assignments/{assignmentId}/acknowledge`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "digitalSignature": "Jane Doe",
    "confirmed": true
  }
  ```
- **Response `200 OK`:** Records signature, snapshot timestamp, and IP address.

### 10.3 Manager Department Policy Overview
- **Route:** `GET /api/manager/policies/overview`
- **Access:** `MANAGER`
- **Response `200 OK`:** Scoped metrics for manager's department (total assigned, pending acknowledgements, overdue counts).

### 10.4 Send Manager Escalation Reminder
- **Route:** `POST /api/manager/policies/assignments/{assignmentId}/remind`
- **Access:** `MANAGER`
- **Response `200 OK`:** Triggers notification to employee regarding approaching policy deadline.

### 10.5 HR Policy Lifecycle Management
- **Routes:**
  - `POST /api/hr/policies` (Create policy draft)
  - `POST /api/hr/policies/{id}/publish` (Publish version and trigger audience assignment cascade)
  - `GET /api/hr/policies/assignments` (Organization-wide compliance audit table)

---

## 11. Department Management & Course Matrix Endpoints

### 11.1 List All Departments
- **Route:** `GET /api/departments`
- **Access:** Authenticated

### 11.2 Get Department Details & Analytics
- **Route:** `GET /api/departments/{departmentId}/details`
- **Access:** Authenticated
- **Response `200 OK`:** Head count, active courses, completion percentage, and active learners.

---

## 12. HR Administration & Employee Management Endpoints

### 12.1 Organization Dashboard Metrics
- **Route:** `GET /api/hr/dashboard/metrics`
- **Access:** `HR_ADMIN`, `SUPER_ADMIN`
- **Response `200 OK`:**
  - `totalEmployees`, `activeEmployees`, `activeLearners`
  - `overallCompletionRate`, `avgTrainingHours` (Estimated Curriculum Duration)
  - `certificatesIssued`, `mandatoryComplianceRate` (90% target)
  - `departmentStats`: Array of divisional metrics.

### 12.2 Employee Workforce List
- **Route:** `GET /api/hr/employees`
- **Access:** `HR_ADMIN`

### 12.3 Excel Employee Batch Import
- **Route:** `POST /api/hr/employees/import`
- **Access:** `HR_ADMIN`
- **Content-Type:** `multipart/form-data` (file: `.xlsx`)

---

## 13. Manager Team Supervision & Reports Endpoints

### 13.1 Team Learning Summary
- **Route:** `GET /api/reports/manager/team-summary`
- **Access:** `MANAGER`, `HR_ADMIN`
- **Response `200 OK`:** Team members, assigned courses, average progress, and overdue compliance flags.

### 13.2 Employee Historical Transcript
- **Route:** `GET /api/reports/manager/employee/{userId}/transcript`
- **Access:** `MANAGER`, `HR_ADMIN`

---

## 14. Learning & Compliance Calendar Endpoints

### 14.1 Get Training Sessions & Events
- **Route:** `GET /api/training-sessions`
- **Access:** Authenticated
- **Response `200 OK`:** Scheduled live workshops, webinars, and operational drills.

### 14.2 Get Training Assignments Calendar Feed
- **Route:** `GET /api/training/assignments`
- **Access:** Authenticated
- **Client Aggregator:** Combined with course deadlines and policy due dates via `calendarService.js`.

---

## 15. Dynamic Rotated Watermark Streaming Endpoints

### 15.1 Stream Watermarked Policy PDF
- **Route:** `GET /api/policies/{policyId}/stream`
- **Access:** Authenticated
- **Response:** PDF binary stream stamped on-the-fly with:
  `PROPERTY OF FAIRMACS SHIPPING & LOGISTICS — CONFIDENTIAL — <EMPLOYEE_NAME> — <TIMESTAMP>`
  Guaranteed zero text clipping across page boundaries via `PolicyWatermarkService`.

---

## 16. Zoho WorkDrive Cloud Integration Endpoints

### 16.1 Generate OAuth Connect URL
- **Route:** `GET /api/integrations/zoho/connect-url`
- **Access:** `HR_ADMIN`

### 16.2 OAuth Callback Listener
- **Route:** `GET /api/integrations/zoho/callback`
- **Access:** Public (Redirect target from Zoho OAuth)

---

## 17. Notification Center Endpoints

### 17.1 List User Notifications
- **Route:** `GET /api/notifications`
- **Access:** Authenticated

### 17.2 Mark Notification as Read
- **Route:** `PATCH /api/notifications/{id}/read`
- **Access:** Authenticated

---

## 18. Reporting & Styled Excel Export Endpoints

### 18.1 Export Policy Assignments Report (HR Organization-Wide)
- **Route:** `GET /api/hr/policies/assignments/export`
- **Access:** `HR_ADMIN`
- **Response:** Styled `.xlsx` file generated via Apache POI with headers, color-coded statuses, and compliance summary.

### 18.2 Export Department Policy Compliance (Manager)
- **Route:** `GET /api/manager/policies/reports/departments/export`
- **Access:** `MANAGER`
- **Response:** Scoped `.xlsx` export for manager's authorized team hierarchy.
