# Fairmacs KMS Backend

Spring Boot backend for the Fairmacs Knowledge Management System.

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- MySQL 8.0+

## Setup Instructions

### 1. Configure Database

Create a MySQL database:

```sql
CREATE DATABASE fairmacs_lms;
```

### 2. Update Application Properties

Edit `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/fairmacs_lms
spring.datasource.username=root
spring.datasource.password=your_mysql_password
jwt.secret=your-secret-key-change-this-in-production-min-256-bits
```

### 3. Build and Run

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

## Project Structure

```
backend/
├── src/main/java/com/fairmacs/lms/
│   ├── FairmacsLmsApplication.java    # Main Spring Boot application
│   ├── config/                         # Configuration classes
│   ├── controller/                     # REST API controllers
│   ├── dto/                            # Data Transfer Objects
│   ├── entity/                         # JPA Entities
│   ├── exception/                      # Exception handling
│   ├── repository/                     # JPA Repositories
│   ├── security/                       # Security configuration
│   └── service/                        # Business logic
└── src/main/resources/
    └── application.properties          # Application configuration
```

## Completed Components

### Entities
- **User** - User accounts with roles (EMPLOYEE, TRAINER, MANAGER, HR_ADMIN)
- **Department** - Organization departments
- **Course** - Learning courses
- **Module** - Course modules
- **Lesson** - Individual lessons within modules
- **Enrollment** - User course enrollments
- **LessonProgress** - Lesson completion tracking
- **Certificate** - Generated certificates

### Security
- JWT authentication filter
- Spring Security configuration
- CORS configuration
- Password encoding with BCrypt

### Exception Handling
- Global exception handler
- ResourceNotFoundException

### DTOs
- LoginRequest
- LoginResponse
- ApiResponse<T>

## Next Steps

### Phase 1: Authentication (In Progress)
- [ ] Create UserRepository
- [ ] Create UserService
- [ ] Create AuthController with login endpoint
- [ ] Implement JWT token generation
- [ ] Test authentication flow

### Phase 2: Core APIs
- [ ] Create repositories for all entities
- [ ] Create service layer
- [ ] Create REST controllers
- [ ] Implement CRUD operations

### Phase 3: Business Logic
- [ ] Course enrollment logic
- [ ] Progress tracking
- [ ] Assessment scoring
- [ ] Certificate generation

### Phase 4: Advanced Features
- [ ] File upload/download
- [ ] Email notifications
- [ ] Analytics endpoints
- [ ] Audit logging

## API Endpoints (Planned)

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/{id}` - Get course by ID
- `POST /api/courses` - Create course (HR/Trainer)
- `PUT /api/courses/{id}` - Update course (HR/Trainer)
- `DELETE /api/courses/{id}` - Delete course (HR)

### Enrollments
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments/user/{userId}` - Get user enrollments
- `PUT /api/enrollments/{id}/progress` - Update progress

### Assessments
- `GET /api/assessments/course/{courseId}` - Get course assessment
- `POST /api/assessments/{id}/submit` - Submit assessment

### Reports
- `GET /api/reports/hr-metrics` - HR dashboard metrics
- `GET /api/reports/department/{department}` - Department analytics

## Database Schema

The application uses Hibernate's `ddl-auto=update` to automatically create tables on startup.

## Environment Variables

Configure in `application.properties`:

- `spring.datasource.url` - Database connection URL
- `spring.datasource.username` - Database username
- `spring.datasource.password` - Database password
- `jwt.secret` - JWT secret key (min 256 bits for production)
- `jwt.expiration` - JWT token expiration time in milliseconds
- `cors.allowed-origins` - Comma-separated list of allowed CORS origins

## Development

Run with hot reload:

```bash
mvn spring-boot:run
```

Run tests:

```bash
mvn test
```

Build for production:

```bash
mvn clean package
```

## Notes

- Lombok warnings in IDE are due to IDE-specific Lombok compatibility issues. The code compiles correctly with Maven.
- The backend is configured to work with the React frontend at `http://localhost:5173`
- JWT tokens are stored in localStorage on the frontend and sent in the Authorization header
