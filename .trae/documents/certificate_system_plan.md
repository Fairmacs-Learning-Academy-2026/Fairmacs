# Certificate System Implementation Plan

## Repository Research

### Current State
The certificate system exists in a **partial, mock-only state** across both frontend and backend:

**Backend (Spring Boot):**
- [Certificate.java](file:///R:/lms/backend/src/main/java/com/fairmacs/lms/entity/Certificate.java) Entity exists with fields: `id`, `certificateId` (unique), `user` (ManyToOne), `course` (ManyToOne), `score`, `pdfUrl`, `issuedAt`
- [Enrollment.java](file:///R:/lms/backend/src/main/java/com/fairmacs/lms/entity/Enrollment.java) Entity has `certificateId`, `completedDate`, `score` fields but **no service layer logic** to populate them on completion
- **Missing entirely:** `CertificateRepository`, `CertificateService`, `CertificateController`, `EnrollmentRepository`, `EnrollmentService`, `CourseRepository`
- Only controller: `AuthController` at `/api/auth/login`
- Only repositories/services: `UserRepository` + `UserService`

**Frontend (React + Zustand):**
- [CertificateViewer.jsx](file:///R:/lms/frontend/src/components/CertificateViewer.jsx) Beautiful certificate template exists (with course name, cert ID, score, date) but uses **hardcoded mock fallback data** (line 8-13)
- [QuizModal.jsx](file:///R:/lms/frontend/src/components/QuizModal.jsx) On passing quiz (≥80%), generates **random frontend-only cert ID**: `FM-CERT-${Math.floor(10000+Math.random()*90000)}` (line 259). Calls `onPassCertificate()` callback but data never persisted.
- [enrollmentStore.js](file:///R:/lms/frontend/src/stores/enrollmentStore.js) Has `completeCourse()` action storing cert in local state, no backend sync. Certificates array initialized empty.
- [MyLearning.jsx](file:///R:/lms/frontend/src/components/MyLearning.jsx) "My Digital Certificates" button (line 79) exists but callback functionality not wired to a real viewer list.
- [ManagerDashboard.jsx](file:///R:/lms/frontend/src/components/ManagerDashboard.jsx) **No certificate verification UI** at all — only team roster + compliance stats.
- [HrAdminDashboard.jsx](file:///R:/lms/frontend/src/components/HrAdminDashboard.jsx) **No certificate verification UI** — has 9 sub-tabs (overview/employees/departments/courses/paths/assignments/reports/announcements/settings) but none for certificates.
- Roles confirmed in [Role.java](file:///R:/lms/backend/src/main/java/com/fairmacs/lms/entity/Role.java): `EMPLOYEE`, `TRAINER`, `MANAGER`, `HR_ADMIN`

### Requirements Mapping to Gaps
| User Requirement | Current Gap |
|---|---|
| Certificate generated on course completion | Frontend-only random gen; no backend persistence; no enrollment completion logic |
| Course name displayed on certificate | Works in UI mock mode; needs real Course entity data |
| Unique certificate code | Random 5-digit number in frontend; not DB-unique; collision risk; no DB index enforcement leveraged |
| Manager enters unique code to verify | NO UI exists in ManagerDashboard; NO backend `/verify` endpoint |
| Certificate shown to Manager & HR after verify | NO verification result screen; NO role-gated certificate access endpoints |

---

## Files and Modules

### Backend (Spring Boot) — New Files
- `backend/src/main/java/com/fairmacs/lms/repository/CertificateRepository.java` — JPA repo: findByCertificateId, findByUserId, existsByCertificateId
- `backend/src/main/java/com/fairmacs/lms/repository/EnrollmentRepository.java` — JPA repo: findByUserAndCourse, findByUserId, update status/completedDate
- `backend/src/main/java/com/fairmacs/lms/repository/CourseRepository.java` — JPA repo: findById
- `backend/src/main/java/com/fairmacs/lms/service/CertificateService.java` — generate unique cert ID (FM-CERT-{YYYY}-{XXXX}), create certificate on enrollment completion, verify by cert ID
- `backend/src/main/java/com/fairmacs/lms/service/EnrollmentService.java` — complete course (set status=COMPLETED, score, completedDate), trigger certificate generation via CertificateService
- `backend/src/main/java/com/fairmacs/lms/controller/CertificateController.java` — 3 endpoints:
  - `POST /api/certificates/generate` (EMPLOYEE) — create cert on course completion
  - `GET /api/certificates/verify/{certificateId}` (MANAGER, HR_ADMIN, EMPLOYEE for own) — public-facing verify returns full cert details
  - `GET /api/certificates/user/{userId}` (EMPLOYEE self, MANAGER team, HR_ADMIN all)
- `backend/src/main/java/com/fairmacs/lms/dto/CertificateDTO.java` — response DTO with user name, course title, certId, score, issueDate, department, designation
- `backend/src/main/java/com/fairmacs/lms/dto/CompleteCourseRequest.java` — enrollmentId, score request body
- Update `backend/src/main/java/com/fairmacs/lms/security/SecurityConfig.java` — permit new `/api/certificates/**` endpoints with role rules

### Frontend (React) — Modified Files
- **Modified** `frontend/src/components/QuizModal.jsx` (line 250-266): Replace random cert ID gen with call to new enrollment/certificate API or zustand action that uses the API; then show real cert.
- **Modified** `frontend/src/stores/enrollmentStore.js` (line 69-95): Update `completeCourse()` to call API service; add `verifyCertificate(certId)` action; add `fetchUserCertificates(userId)` action.
- **Modified** `frontend/src/services/enrollmentService.js`: Add `completeCourse(enrollmentId, score)`, `verifyCertificate(certificateId)`, `getUserCertificates(userId)` functions.
- **New component** or section added to `frontend/src/components/ManagerDashboard.jsx`: Add a "Certificate Verification" card/panel at the top with input field for unique cert code → on submit, call verify endpoint → open CertificateViewer in "verified" mode (showing that manager verified it, who verified, timestamp).
- **New sub-tab** added to `frontend/src/components/HrAdminDashboard.jsx`: Add `'certificates'` sub-tab with two panels: (a) Verify Certificate (input field), (b) Recent Certificates Issued list. On verify success, display full certificate.
- **Modified** `frontend/src/components/CertificateViewer.jsx`: Add `verificationMode` prop that shows a "VERIFIED BY [Manager/HR Name]" banner at top with verification timestamp; ensure it fully uses the certificate prop (course title from real course data, user name, dept, designation from cert DTO, not hardcoded fallbacks).
- **Modified** `frontend/src/components/MyLearning.jsx`: Wire `onOpenCertificates` to open a modal listing user's real certificates from API, each clickable to open CertificateViewer.

---

## Implementation Steps (Dependency Order)

### Phase 1: Backend Repositories & Services (Bottom-up)
1. **Create `CourseRepository.java`** — `JpaRepository<Course, Long>`. Needed because Certificate and Enrollment entities reference Course via ManyToOne; services must fetch course title for DTO.
2. **Create `EnrollmentRepository.java`** — `JpaRepository<Enrollment, Long>` + custom methods: `findByUserIdAndCourseId`, `findByUserId`.
3. **Create `CertificateRepository.java`** — `JpaRepository<Certificate, Long>` + methods: `findByCertificateId(String)` (unique lookup), `existsByCertificateId(String)` (for unique ID retry), `findByUserId(Long)`.
4. **Create `CertificateService.java`** — Two core methods:
   - `generateCertificateId()`: Format `FM-CERT-{currentYear}-{random4digits}` → loop checking `existsByCertificateId` until unique.
   - `createCertificate(userId, courseId, score)`: Build Certificate entity, set unique ID, persist. Return Certificate entity.
   - `verifyCertificate(certificateId)`: Look up by cert ID → return DTO with joined user/course data → or throw ResourceNotFoundException.
5. **Create `EnrollmentService.java`**:
   - `completeCourse(enrollmentId, score)`: Load enrollment → set `status=COMPLETED`, `progressPercent=100`, `score`, `completedDate=now`. Then call `certificateService.createCertificate(user.id, course.id, score)` and store returned `certificateId` back on enrollment. Persist both.
6. **Create DTOs** (`CertificateDTO.java`, `CompleteCourseRequest.java`).
7. **Create `CertificateController.java`** with 3 endpoints using role rules:
   - `@PostMapping("/generate")` → calls `EnrollmentService.completeCourse()`. Only the enrolled employee or HR can trigger.
   - `@GetMapping("/verify/{certificateId}")` → calls `CertificateService.verifyCertificate()`. Accessible by MANAGER, HR_ADMIN, and EMPLOYEE (but only their own cert unless higher role).
   - `@GetMapping("/user/{userId}")` → list of certs for a user. Role: self employee, manager for team, HR for any.
8. **Update `SecurityConfig.java`** — Add request matchers for `/api/certificates/**` with appropriate `hasAnyRole` rules; ensure CORS allows frontend.

### Phase 2: Frontend Services & State
9. **Update `enrollmentService.js`** — Add three functions:
   - `completeCourse(enrollmentId, score)` → POST `/api/certificates/generate`
   - `verifyCertificate(certId)` → GET `/api/certificates/verify/${certId}`
   - `getUserCertificates(userId)` → GET `/api/certificates/user/${userId}`
10. **Update `enrollmentStore.js`**:
    - Update `completeCourse(userId, courseId, score)` to call `enrollmentService.completeCourse` → update enrollments + certificates in state with response.
    - Add `verifyCertificate(certId)` action → returns verified cert DTO or null.
    - Add `fetchUserCertificates(userId)` → populates certificates array.

### Phase 3: Frontend UI Changes
11. **Update `QuizModal.jsx`** (lines 250-266): Replace the random `certId` generation with a call to `enrollmentStore.completeCourse()`. On success, pass the real returned certificate data into `onPassCertificate`.
12. **Update `CertificateViewer.jsx`**:
    - Replace hardcoded fallback (lines 8-13) — require certificate prop or show loading.
    - Pull user info (name, employee ID, department, designation) from the certificate DTO instead of `useAuth().user` (so manager/HR sees the **certified employee's** details, not their own).
    - Add optional `verificationData` prop: when present, render a green banner at top: "✓ VERIFIED CREDENTIAL — Verified by {verificationData.verifierName} ({verificationData.verifierRole}) on {date}".
13. **Add verification section to `ManagerDashboard.jsx`**:
    - Insert a new card at the top (above metrics or between header + metrics) titled "Verify Team Certificate" with a text input + "Verify" button.
    - On submit: call `enrollmentStore.verifyCertificate(input)`. If found: open CertificateViewer modal with verificationData set. If not: show inline error "Certificate ID not found in Fairmacs credential registry".
14. **Add certificates sub-tab to `HrAdminDashboard.jsx`**:
    - Add `'certificates'` to the sub-tab array (after `'reports'`) with label "Certificates".
    - Panel content: two-column layout:
      - Left: Certificate Verification widget (same as ManagerDashboard — input + verify → opens viewer with verified banner)
      - Right: "Recently Issued Credentials" list (mock first 5 from cert store; shows cert ID, employee name, course, date — clickable to open viewer)
15. **Update `MyLearning.jsx`** onOpenCertificates:
    - Wire the button (line 79) to open a modal listing the user's certificates from `enrollmentStore.getUserCertificates(user.id)`.
    - Each list item click opens CertificateViewer for that cert.

### Phase 4: Wire Together & Polish
16. **Wire `onOpenCertificates` callback in `App.jsx`** to pass the cert list modal.
17. **Compile backend** with `mvn compile` to confirm no JPA/Spring wiring errors.
18. **Run frontend build/lint** to confirm no React errors.

---

## Dependencies and Considerations

- **SecurityConfig dependency order**: Step 8 must come before testing endpoints; if endpoints return 401/403 it means the security rules weren't applied.
- **Entity relationships**: Certificate `@ManyToOne` to User and Course uses LAZY fetch. The CertificateService must handle proper entity loading with Hibernate.initialize or use DTO projection/fetch joins to avoid LazyInitializationException. Prefer fetch join in repository queries.
- **Unique cert ID generation**: Using `FM-CERT-{YYYY}-{rand4}`. Risk: collision on same year with high volume. Mitigation: `existsByCertificateId()` loop (max 5 retries) plus database `unique=true` constraint on `certificateId` column already in entity.
- **Role-based endpoint access for verify**: Manager should only be able to verify (read) certificates; employees should only see their own. HR_ADMIN sees all. Implement this check in controller/service layer (not just SecurityConfig URL rules) for defense in depth: when an EMPLOYEE calls `/verify/{id}`, check `certificate.user.id == currentUser.id` or throw AccessDenied.
- **Frontend role check for verification UI**: Certificate verification widgets in ManagerDashboard and HrAdminDashboard only render for MANAGER / HR_ADMIN roles (use `useAuth().user.role`).
- **Current QuizModal uses mock `quiz.title.replace()` to derive course name**: Replace with actual course title from backend certificate response so the name is 100% consistent.

---

## Validation

### Backend Validation
1. `cd r:\lms\backend && mvn compile` — succeeds with no compilation errors; Spring context loads (check via logs that CertificateRepository/EnrollmentRepository beans are created).
2. `curl` or Postman manual tests:
   - `POST /api/certificates/generate` with enrollment + score → returns 201 with cert containing `certificateId: "FM-CERT-2026-XXXX"`
   - `GET /api/certificates/verify/FM-CERT-2026-XXXX` → returns full CertificateDTO (userName, courseTitle, score, issueDate, dept, designation)
   - `GET /api/certificates/verify/INVALID` → 404
   - `GET /api/certificates/user/{userId}` → list of certificates
3. Role enforcement:
   - EMPLOYEE JWT trying to verify another user's cert → 403
   - MANAGER JWT trying to verify any cert → 200
   - HR_ADMIN JWT trying to verify any cert → 200

### Frontend Validation
1. `cd r:\lms\frontend && npm run build` — no compile/lint errors
2. **Scenario A — Employee completes course**:
   - Login as employee → open course → take quiz → pass (≥80)
   - Click "View Certificate": CertificateViewer opens; displays **real course title** from backend; cert ID is `FM-CERT-2026-XXXX` format; not hardcoded "FM-CERT-00142"
3. **Scenario B — Manager verifies cert**:
   - Login as Manager → ManagerDashboard loads
   - See "Verify Team Certificate" widget
   - Enter valid cert ID → CertificateViewer opens with "✓ VERIFIED CREDENTIAL — Verified by [Manager Name] (Manager) on [date]" banner showing the actual employee's course cert details (not manager's own)
   - Enter invalid ID → inline red error: "Certificate ID not found"
4. **Scenario C — HR verifies cert**:
   - Login as HR_ADMIN → Certificates sub-tab
   - Left panel: verify widget (same behavior as manager)
   - Right panel: Recent certificates list → click row → opens viewer

### IDE Diagnostics
- Run GetDiagnostics after edits — 0 Java/JS errors.

---

## Risks

| Risk | Mitigation / Fallback |
|---|---|
| **Backend lazy-loading exceptions** on certificate verify (User/Course LAZY) | Use `@Query` with `JOIN FETCH` in `CertificateRepository.findByCertificateId` to eagerly load user and course in single query. Alternative: DTO projection with constructor expression. |
| **Unique cert ID collision** despite existsBy check (race condition) | Database `unique=true` constraint on `certificateId` column is the final guard. On `DataIntegrityViolationException`, retry with new ID (up to 3 times) in CertificateService. |
| **Frontend still uses mock data flow** after backend is added | Ensure QuizModal line 259 **no longer** uses `Math.random()` — grep for that pattern post-implementation to confirm it's gone. Also ensure enrollmentStore.completeCourse actually awaits the service call and uses returned data, not local mock creation. |
| **Role-based access mistakes** (employees verifying others' certs) | Dual enforcement: (1) SecurityConfig URL rules, (2) Explicit ownership check in CertificateService.verifyCertificate method comparing current user JWT userId vs certificate.userId; throw AccessDeniedException if EMPLOYEE and mismatch. |
| **CertificateViewer still shows wrong user** (manager sees own name instead of employee's when verifying) | Strict rule: CertificateViewer always pulls identity fields from `certificate` prop (employeeName, employeeId, department, designation) and never from `useAuth().user`. `useAuth()` only used for verification banner info. Add a prop test to confirm behavior. |
| **SecurityConfig.java edit breaks JWT auth for existing /api/auth/login** | Add new requestMatchers for `/api/certificates/**` separately without touching the existing `/api/auth/**` and `permitAll()` lines. Diff after edit to confirm. |
