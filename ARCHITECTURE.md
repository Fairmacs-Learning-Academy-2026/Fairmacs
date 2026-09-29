# Fairmacs LMS - Technical Architecture

## Overview
The Fairmacs LMS has been enhanced with a robust frontend architecture ready for backend integration with Spring Boot and MySQL.

---

## 1. State Management (Zustand)

### Store Structure
Located in `src/stores/`

#### authStore.js
- **State**: user, isAuthenticated, isLoading
- **Actions**: login, logout, initializeAuth, updateUser
- **Purpose**: Centralized authentication state management

#### courseStore.js
- **State**: courses, selectedCourse, courseProgress, searchQuery, categoryFilter, levelFilter
- **Actions**: setCourses, setSelectedCourse, updateCourseProgress, setSearchQuery, setCategoryFilter, setLevelFilter
- **Computed**: getFilteredCourses, getCourseById, getCoursesByDepartment
- **Purpose**: Course catalog and progress management

#### notificationStore.js
- **State**: notifications, unreadCount
- **Actions**: setNotifications, addNotification, markAsRead, markAllAsRead, deleteNotification, clearAll
- **Computed**: getUnreadNotifications, getNotificationsByType
- **Purpose**: Real-time notification management

#### enrollmentStore.js
- **State**: enrollments, certificates
- **Actions**: enrollInCourse, updateProgress, completeLesson, completeCourse
- **Computed**: getUserProgress, getCourseProgress, getUserCertificates, getCompletionRate
- **Purpose**: Enrollment tracking and certificate management

---

## 2. Routing Architecture (React Router)

### Route Structure
Located in `src/routes/`

#### Protected Routes
- **ProtectedRoute**: Requires authentication, redirects to /login if not authenticated
- **RoleRoute**: Requires specific role, redirects to /unauthorized if unauthorized

#### Role-Based Routes
- **EmployeeRoute**: EMPLOYEE role only
- **TrainerRoute**: TRAINER role only
- **ManagerRoute**: MANAGER role only
- **HrAdminRoute**: HR_ADMIN role only

### Route Configuration (App.jsx)
```
/login → Login component
/unauthorized → Unauthorized component
/* → MainApp (protected)
```

### URL Structure (Future)
```
/employee/*      → Employee dashboard and learning
/trainer/*       → Trainer course management
/manager/*       → Manager team oversight
/admin/*         → HR administration
```

---

## 3. API Service Layer

### Service Structure
Located in `src/services/`

#### authService.js
- login(email, password)
- logout()
- getCurrentUser()
- isAuthenticated()
- getToken()
- refreshToken()
- changePassword(currentPassword, newPassword)

#### courseService.js
- getAllCourses()
- getCourseById(courseId)
- getCoursesByCategory(category)
- searchCourses(query)
- createCourse(courseData)
- updateCourse(courseId, courseData)
- deleteCourse(courseId)

#### enrollmentService.js
- enrollInCourse(courseId)
- getUserEnrollments(userId)
- updateLessonProgress(enrollmentId, lessonId, completed)
- getCourseProgress(userId, courseId)
- unenrollFromCourse(enrollmentId)

#### employeeService.js
- getAllEmployees()
- getEmployeeById(employeeId)
- getEmployeesByDepartment(department)
- createEmployee(employeeData)
- updateEmployee(employeeId, employeeData)
- deleteEmployee(employeeId)

#### assessmentService.js
- getAssessmentByCourse(courseId)
- submitAssessment(assessmentId, answers)
- getUserAttempts(userId, assessmentId)
- createAssessment(assessmentData)
- updateAssessment(assessmentId, assessmentData)

#### trainingService.js
- assignTraining(assignmentData)
- getUserAssignments(userId)
- getAllAssignments()
- createCalendarEvent(eventData)
- getCalendarEvents(month, year)
- deleteAssignment(assignmentId)

#### reportService.js
- getHRMetrics()
- getDepartmentAnalytics(department)
- getAuditLogs(limit, offset)
- getCompletionReport(filters)
- exportReport(reportType, format)
- getOverdueReport()

---

## 4. Environment Configuration

### Environment Variables
Located in `.env.example`

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

### Usage
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
```

---

## 5. Component Architecture

### Current Components
- **Header**: Navigation, notifications, user menu
- **Sidebar**: Role-based navigation
- **Login**: Authentication with demo accounts
- **Unauthorized**: Access denied page
- **Dashboards**: Employee, Trainer, Manager, HR Admin
- **Learning**: MyLearning, CourseCatalog, CourseViewer
- **Management**: EmployeeManagement, DepartmentManagement
- **Training**: TrainingCalendar, TrainingAssignmentModal
- **Analytics**: HrAdminDashboard with drilldowns
- **Assessment**: QuizModal, CertificateViewer

### Component Hierarchy
```
App (Router)
├── Login
├── Unauthorized
└── MainApp (Protected)
    ├── Header
    ├── Sidebar
    └── Main Content
        ├── Overview
        ├── MyLearning
        ├── CourseCatalog
        ├── LearningPaths
        ├── TrainingCalendar
        ├── Role Dashboards
        └── Modals
```

---

## 6. Data Flow Architecture

### Current Flow (Mock Data)
```
Component → Mock Data → UI
```

### Future Flow (Backend Integration)
```
Component → Service → REST API → Spring Boot → MySQL
```

### Example: Course Enrollment
```
1. User clicks "Enroll" button
2. Component calls enrollmentService.enrollInCourse(courseId)
3. Service makes POST request to /api/enrollments
4. Spring Boot validates and creates enrollment record
5. MySQL stores enrollment data
6. Response updates Zustand enrollmentStore
7. Component re-renders with new state
```

---

## 7. Backend Integration Roadmap

### Phase 1: Authentication
- [ ] Implement Spring Security with JWT
- [ ] Create User, Role, Permission entities
- [ ] Build login/logout endpoints
- [ ] Integrate with React authStore

### Phase 2: Core Entities
- [ ] Department entity
- [ ] Employee entity
- [ ] Course entity
- [ ] Module entity
- [ ] Lesson entity

### Phase 3: Enrollment System
- [ ] Enrollment entity
- [ ] Progress tracking entity
- [ ] Certificate entity
- [ ] Build enrollment APIs

### Phase 4: Assessment Engine
- [ ] Assessment entity
- [ ] Question entity
- [ ] Answer entity
- [ ] Attempt entity
- [ ] Build scoring logic

### Phase 5: Training Management
- [ ] TrainingAssignment entity
- [ ] CalendarEvent entity
- [ ] Notification entity
- [ ] Build assignment APIs

### Phase 6: Analytics
- [ ] Build HR metrics endpoints
- [ ] Implement department analytics
- [ ] Create audit logging
- [ ] Build report generation

### Phase 7: File Storage
- [ ] Configure file upload endpoints
- [ ] Integrate with AWS S3 or local storage
- [ ] Build certificate PDF generation

---

## 8. Database Schema (Proposed)

### Core Tables
```sql
-- Users & Authentication
users (id, email, password, name, role, department_id, designation, status)
roles (id, name, permissions)
permissions (id, name, description)

-- Organization
departments (id, name, head_id, description)
employees (id, user_id, department_id, branch, joining_date)

-- Learning Content
courses (id, title, description, category, level, duration, banner_url)
modules (id, course_id, title, order_index)
lessons (id, module_id, title, type, content_url, duration, order_index)

-- Enrollments & Progress
enrollments (id, user_id, course_id, status, enrolled_date, completed_date)
lesson_progress (id, enrollment_id, lesson_id, completed, completed_at)

-- Assessments
assessments (id, course_id, title, time_limit, passing_score)
questions (id, assessment_id, type, question_text, options, correct_index)
assessment_attempts (id, assessment_id, user_id, score, completed_at, passed)

-- Certificates
certificates (id, user_id, course_id, certificate_id, issued_date, score, pdf_url)

-- Training Management
training_assignments (id, course_id, target_type, target_value, due_date, requirement_type)
calendar_events (id, title, date, time, trainer, department, location, type)

-- Notifications
notifications (id, user_id, title, message, type, read, created_at)

-- Analytics & Audit
audit_logs (id, user_id, action, entity_type, entity_id, timestamp, ip_address)
department_analytics (id, department_id, headcount, completion_rate, active_courses, overdue_count)
```

---

## 9. Security Considerations

### Frontend
- JWT token storage in localStorage (consider httpOnly cookies for production)
- Role-based route protection
- Input validation in forms
- XSS prevention via React's built-in escaping

### Backend (Future)
- Spring Security with JWT
- Password hashing (BCrypt)
- Role-based access control (RBAC)
- CORS configuration
- Rate limiting
- SQL injection prevention (JPA/Hibernate)
- CSRF protection

---

## 10. Performance Optimization

### Current
- Code splitting with Vite
- Lazy loading for large components
- Optimized bundle size (477 KB gzipped)

### Future
- API response caching
- Image optimization
- Service Worker for offline support
- Database query optimization
- Redis caching for frequently accessed data

---

## 11. Testing Strategy

### Frontend Testing
- Component testing with React Testing Library
- Form validation tests
- Route protection tests
- Integration tests for service layer

### Backend Testing (Future)
- Unit tests with JUnit
- Service layer tests with Mockito
- Controller tests with MockMvc
- Repository tests with TestContainers
- End-to-end tests with Selenium/Playwright

---

## 12. Deployment Architecture

### Development
```
React (Vite Dev Server) → Mock Data
```

### Production
```
React (Nginx) → Spring Boot (Tomcat) → MySQL
```

### Cloud Deployment (Future)
```
React (Vercel/Netlify) → Spring Boot (AWS EC2/Heroku) → MySQL (AWS RDS)
File Storage (AWS S3)
```

---

## 13. Next Steps

### Immediate
1. Gradually migrate components to use Zustand stores
2. Replace mock data with API service calls
3. Implement proper error handling and loading states

### Short-term
1. Set up Spring Boot project structure
2. Configure database connection
3. Implement authentication endpoints
4. Build core entity repositories

### Long-term
1. Complete all API endpoints
2. Implement file storage integration
3. Build certificate generation system
4. Add email notifications
5. Implement real-time features (WebSocket)

---

## 14. Key Benefits

### Scalability
- Modular architecture allows easy feature additions
- Service layer enables backend swapping
- State management prevents prop drilling

### Maintainability
- Clear separation of concerns
- Reusable service functions
- Centralized state management

### Developer Experience
- Type-safe API contracts (future TypeScript migration)
- Predictable data flow
- Easy debugging with DevTools

### Enterprise Readiness
- Role-based access control
- Audit logging infrastructure
- Analytics and reporting capabilities
- Security best practices

---

## Conclusion

The Fairmacs LMS now has a production-ready frontend architecture that can seamlessly integrate with a Spring Boot backend. The modular design, proper routing, service layer, and state management provide a solid foundation for building a scalable, maintainable, and enterprise-grade learning management system.
