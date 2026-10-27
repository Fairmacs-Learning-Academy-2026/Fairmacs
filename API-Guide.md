# Fairmacs LMS — REST API Reference & Developer Guide

**Base URL:** `http://localhost:8080/api` (Local Dev) / `https://lms.fairmacs.com/api` (Production)  
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
10. [Department Management & Course Matrix Endpoints](#10-department-management--course-matrix-endpoints)
11. [HR Administration & Employee Onboarding Endpoints](#11-hr-administration--employee-onboarding-endpoints)
12. [Reports & Manager Analytics Endpoints](#12-reports--manager-analytics-endpoints)
13. [Corporate Training Calendar Endpoints](#13-corporate-training-calendar-endpoints)
14. [Zoho WorkDrive Integration Endpoints](#14-zoho-workdrive-integration-endpoints)
15. [Notification Center Endpoints](#15-notification-center-endpoints)

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

### 2.1 Success Response Example
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... }
}
```

### 2.2 Error Response Format
When a request fails, the server returns an HTTP status code accompanied by a standard Spring Boot RFC 7807 problem detail payload:

```json
{
  "timestamp": "2026-10-27T04:45:00.120Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid employee email format.",
  "path": "/api/hr-admin/employees"
}
```

### HTTP Status Code Conventions
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure, missing required fields.
- `401 Unauthorized`: Missing, expired, or invalid JWT token.
- `403 Forbidden`: Authenticated user lacks required role or permission.
- `404 Not Found`: Target entity ID does not exist.
- `409 Conflict`: Duplicate entry (e.g., employee email already registered).
- `502 Bad Gateway`: External integration failure (e.g., Zoho WorkDrive API error).

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
      "employeeId": "EMP-9021",
      "name": "Jane Doe",
      "email": "employee@fairmacs.com",
      "role": "EMPLOYEE",
      "department": "Operations",
      "designation": "Freight Coordinator",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane"
    }
  }
  ```

### 3.2 Get Current User Profile
- **Route:** `GET /api/auth/me`
- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "id": 104,
    "employeeId": "EMP-9021",
    "name": "Jane Doe",
    "email": "employee@fairmacs.com",
    "role": "EMPLOYEE",
    "department": "Operations",
    "level": "L2",
    "branch": "Chennai",
    "joiningDate": "2024-03-15",
    "status": "ACTIVE"
  }
  ```

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
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Password changed successfully."
  }
  ```

---

## 4. Course Catalog & Curriculum Endpoints

### 4.1 List All Active Courses
- **Route:** `GET /api/courses`
- **Access:** Authenticated
- **Query Params (Optional):** `category`, `level`, `search`
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 1,
      "courseId": "IMP-FND-001",
      "title": "Import Logistics Fundamentals",
      "description": "Comprehensive fundamentals of sea and air freight import processes.",
      "category": "Operations",
      "level": "L1",
      "duration": "4h 30m",
      "totalLessons": 8,
      "thumbnail": "https://images.unsplash.com/photo-1578575437130-527eed3abbec",
      "published": true
    }
  ]
  ```

### 4.2 Get Course Details with Modules & Lessons
- **Route:** `GET /api/courses/{id}`
- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "id": 1,
    "courseId": "IMP-FND-001",
    "title": "Import Logistics Fundamentals",
    "modules": [
      {
        "id": 10,
        "title": "Module 1: Maritime Freight Overview",
        "orderIndex": 1,
        "lessons": [
          {
            "id": 101,
            "lessonId": "IMP-FND-M01-L01",
            "title": "Bill of Lading Overview",
            "type": "VIDEO",
            "videoUrl": "https://www.youtube.com/watch?v=example",
            "duration": "10:15",
            "workdriveFileId": null
          },
          {
            "id": 102,
            "lessonId": "IMP-FND-M01-L02",
            "title": "Customs Documentation Standard SOP",
            "type": "PDF",
            "workdriveFileId": "uqi2q368e8c06e5bc44de87954550476aa546"
          }
        ]
      }
    ]
  }
  ```

---

## 5. Course Authoring & Drafts Endpoints

### 5.1 Create & Publish Course
- **Route:** `POST /api/courses/authoring/create`
- **Access:** `TRAINER`, `HR_ADMIN`
- **Request Body:**
  ```json
  {
    "courseId": "EXP-AIR-002",
    "title": "Export Air Cargo Compliance",
    "description": "Aviation regulatory compliance for export consignments.",
    "category": "Documentation",
    "level": "L2",
    "duration": "2h 15m",
    "modules": [
      {
        "title": "IATA Cargo Guidelines",
        "orderIndex": 1,
        "lessons": [
          {
            "title": "Hazardous Goods Declarations",
            "type": "PDF",
            "workdriveFileId": "file_id_zoho_12345"
          }
        ]
      }
    ]
  }
  ```

### 5.2 Save / Update Course Draft
- **Route:** `POST /api/courses/drafts`
- **Access:** `TRAINER`, `HR_ADMIN`
- **Request Body:** JSON snapshot of curriculum in progress.

### 5.3 List Saved Drafts
- **Route:** `GET /api/courses/drafts`
- **Access:** `TRAINER`, `HR_ADMIN`

---

## 6. Course Assignment Engine Endpoints

### 6.1 Assign Course to an Entire Department
- **Route:** `POST /api/course-assignments/department`
- **Access:** `HR_ADMIN`
- **Request Body:**
  ```json
  {
    "courseId": 1,
    "department": "Documentation",
    "mandatory": true,
    "dueDate": "2026-11-30"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "assignedCount": 24,
    "department": "Documentation",
    "message": "Course successfully assigned to 24 employees."
  }
  ```

### 6.2 Assign Course to Specific Employees
- **Route:** `POST /api/course-assignments/employees`
- **Access:** `HR_ADMIN`
- **Request Body:**
  ```json
  {
    "courseId": 1,
    "employeeIds": [101, 102, 105],
    "mandatory": true,
    "dueDate": "2026-12-15"
  }
  ```

---

## 7. Enrollments & Learning Progress Endpoints

### 7.1 Self-Enroll in Course
- **Route:** `POST /api/enrollments/enroll/{courseId}`
- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "enrollmentId": 302,
    "courseId": 1,
    "status": "IN_PROGRESS",
    "progressPercentage": 0.0,
    "enrolledAt": "2026-10-27T04:50:00Z"
  }
  ```

### 7.2 Get Enrolled Courses ("My Learning")
- **Route:** `GET /api/enrollments/my-learning`
- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  [
    {
      "enrollmentId": 302,
      "courseId": 1,
      "courseTitle": "Import Logistics Fundamentals",
      "status": "IN_PROGRESS",
      "progressPercentage": 62.5,
      "completedLessons": 5,
      "totalLessons": 8,
      "mandatory": true,
      "dueDate": "2026-11-30"
    }
  ]
  ```

### 7.3 Toggle Lesson Completion
- **Route:** `POST /api/lesson-progress/toggle`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "courseId": 1,
    "lessonId": 101,
    "completed": true
  }
  ```

---

## 8. Quizzes & Assessment Engine Endpoints

### 8.1 Get Quiz Questions for a Course
- **Route:** `GET /api/quizzes/course/{courseId}`
- **Access:** Authenticated
- **Response `200 OK`:** *(Answers are intentionally stripped for exam integrity)*
  ```json
  {
    "quizId": 5,
    "title": "Import Regulations Assessment",
    "passingScore": 80,
    "timeLimitMinutes": 15,
    "questions": [
      {
        "id": 501,
        "questionText": "Which document is mandatory for customs clearance of sea imports?",
        "options": [
          { "key": "A", "text": "Bill of Lading" },
          { "key": "B", "text": "Packing List" },
          { "key": "C", "text": "Commercial Invoice" },
          { "key": "D", "text": "All of the above" }
        ]
      }
    ]
  }
  ```

### 8.2 Start Timed Quiz Attempt
- **Route:** `POST /api/quizzes/{quizId}/start`
- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "attemptId": 801,
    "quizId": 5,
    "startedAt": "2026-10-27T05:00:00Z",
    "timeLimitMinutes": 15
  }
  ```

### 8.3 Submit Quiz Answers
- **Route:** `POST /api/quizzes/submit`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "attemptId": 801,
    "timeTakenSeconds": 480,
    "answers": {
      "501": "D",
      "502": "B"
    }
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "attemptId": 801,
    "score": 100.0,
    "passed": true,
    "correctCount": 10,
    "totalCount": 10,
    "certificateGenerated": true,
    "certificateId": "FM-CERT-2026-9516"
  }
  ```

---

## 9. Certificates & Verification Endpoints

### 9.1 Download Official Certificate PDF
- **Route:** `GET /api/certificates/{id}/download`
- **Access:** Authenticated
- **Response Header:** `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Certificate-FM-CERT-2026-9516.pdf"`

### 9.2 Public Verification of Certificate
- **Route:** `GET /api/certificates/verify/{certificateNumber}`
- **Access:** Public (Used by auditors, employers, and clients)
- **Response `200 OK`:**
  ```json
  {
    "valid": true,
    "certificateNumber": "FM-CERT-2026-9516",
    "recipientName": "Jane Doe",
    "courseTitle": "Import Logistics Fundamentals",
    "issueDate": "2026-10-27",
    "issuingOrganization": "Fairmacs Learning & Development"
  }
  ```

---

## 10. Department Management & Course Matrix Endpoints

### 10.1 List Departments with Aggregated Metrics
- **Route:** `GET /api/departments`
- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 1,
      "name": "Operations",
      "description": "Freight forwarding, logistics and terminal operations.",
      "employeeCount": 42,
      "activeCoursesCount": 8,
      "completionRate": 78.4
    }
  ]
  ```

### 10.2 Department Course Employee Matrix
- **Route:** `GET /api/departments/{id}/courses/{courseId}/employees`
- **Access:** `HR_ADMIN`, `MANAGER`
- **Response `200 OK`:** Returns individual completion status for all employees in that department enrolled in that course.

---

## 11. HR Administration & Employee Onboarding Endpoints

### 11.1 Search & Filter Employees
- **Route:** `GET /api/hr-admin/employees`
- **Access:** `HR_ADMIN`
- **Query Params:** `query`, `department`, `role`, `status`
- **Response `200 OK`:** List of user profiles with status and department.

### 11.2 Update Employee Lifecycle Status
- **Route:** `PATCH /api/hr-admin/employees/{id}/status`
- **Access:** `HR_ADMIN`
- **Request Body:**
  ```json
  {
    "status": "ON_LEAVE"
  }
  ```
- Allowed Values: `ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`.

### 11.3 Bulk Import Employees via Excel (`.xlsx`)
- **Route:** `POST /api/hr-admin/employees/import`
- **Access:** `HR_ADMIN`
- **Content-Type:** `multipart/form-data`
- **Form Data:** `file: <spreadsheet.xlsx>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "importedCount": 45,
    "skippedCount": 2,
    "errors": [
      "Row 14: EMP-092 already exists in system.",
      "Row 22: Invalid email format 'john@invalid'."
    ]
  }
  ```

---

## 12. Reports & Manager Analytics Endpoints

### 12.1 HR Executive Summary
- **Route:** `GET /api/reports/hr/summary`
- **Access:** `HR_ADMIN`
- **Response `200 OK`:** Overall compliance rates, total learners, active enrollments, and pending certifications.

### 12.2 Manager Direct Reports Overview
- **Route:** `GET /api/reports/manager/team`
- **Access:** `MANAGER`, `HR_ADMIN`
- **Response `200 OK`:** List of direct reports, enrolled courses, completion percentages, and overdue status.

### 12.3 Individual Employee Training Transcript
- **Route:** `GET /api/reports/manager/employee/{userId}/transcript`
- **Access:** `MANAGER`, `HR_ADMIN`
- **Response `200 OK`:** Complete historical record of all assigned and completed courses, quiz attempt histories, and certificates.

---

## 13. Corporate Training Calendar Endpoints

### 13.1 List Scheduled Sessions
- **Route:** `GET /api/training-sessions`
- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 12,
      "title": "Air Cargo Dangerous Goods Regulation Workshop",
      "type": "Workshop",
      "date": "2026-11-15",
      "time": "14:00 - 16:30",
      "targetType": "DEPARTMENT",
      "department": "Operations",
      "instructor": "Captain V. Sharma"
    }
  ]
  ```

### 13.2 Create Training Event
- **Route:** `POST /api/training-sessions`
- **Access:** `TRAINER`, `MANAGER`, `HR_ADMIN`
- **Request Body:** Target audience parameters (`ALL`, `DEPARTMENT`, or list of `targetUserIds`).

---

## 14. Zoho WorkDrive Integration Endpoints

### 14.1 Generate OAuth Connect URL
- **Route:** `GET /api/integrations/zoho/connect-url`
- **Access:** `HR_ADMIN`
- **Response `200 OK`:**
  ```json
  {
    "authorizationUrl": "https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=...&scope=WorkDrive.workspace.ALL..."
  }
  ```

### 14.2 Upload Document to Zoho WorkDrive
- **Route:** `POST /api/integrations/zoho/documents/upload`
- **Access:** `TRAINER`, `HR_ADMIN`
- **Content-Type:** `multipart/form-data`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "fileId": "uqi2q368e8c06e5bc44de87954550476aa546",
    "fileName": "Bill_of_Lading_Guide.pdf",
    "fileType": "pdf",
    "sizeBytes": 1048576
  }
  ```

### 14.3 Securely Stream Document
- **Route:** `GET /api/lessons/{lessonId}/document/stream`
- **Access:** Authenticated
- **Response:** Binary stream of the file with appropriate `Content-Type` header (`application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).

---

## 15. Notification Center Endpoints

### 15.1 Get User Notifications
- **Route:** `GET /api/notifications`
- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  [
    {
      "id": 901,
      "title": "New Mandatory Course Assigned",
      "message": "You have been enrolled in 'Customs Compliance 2026'. Due date: Nov 30.",
      "type": "COURSE_ASSIGNED",
      "read": false,
      "createdAt": "2026-10-27T03:00:00Z"
    }
  ]
  ```

### 15.2 Mark Notification as Read
- **Route:** `PATCH /api/notifications/{id}/read`
- **Access:** Authenticated
