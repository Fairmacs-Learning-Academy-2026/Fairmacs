# Fairmacs LMS

A Learning Management System with a React frontend and Spring Boot backend.

## Project Structure

```
lms/
├── frontend/          # React + Vite frontend application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/           # Spring Boot backend application
│   ├── src/
│   └── pom.xml
└── README.md
```

## Frontend (React + Vite)

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Backend (Spring Boot)

Navigate to the backend directory:

```bash
cd backend
```

Run the application:

```bash
./mvnw spring-boot:run
```

Or use Maven directly:

```bash
mvn spring-boot:run
```

## Database Configuration

The backend uses MySQL. Configure the database connection in `backend/src/main/resources/application.properties`.
