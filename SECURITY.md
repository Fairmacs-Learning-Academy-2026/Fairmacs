# Security Policy

## 🛡️ Supported Versions

We actively provide security updates and patches for the following versions of **Fairmacs LMS**:

| Version | Supported          | Security Maintenance Level |
| ------- | ------------------ | -------------------------- |
| 1.0.x   | :white_check_mark: | Active security updates    |
| < 1.0   | :x:                | End of Life (EOL)          |

---

## 🔒 Reporting a Vulnerability

The Fairmacs LMS engineering team takes the security of our platform and user data seriously. If you believe you have discovered a security vulnerability or sensitive information exposure, please adhere to our responsible disclosure process:

1. **Do NOT report security vulnerabilities via public GitHub issues, discussions, or pull requests.**
2. Send an email with complete details to:
   - **Primary Contact**: `security@fairmacs.com` (or repository maintainers)
3. Please include the following information in your advisory:
   - **Type of vulnerability** (e.g., Broken Access Control, SQL injection, Authentication bypass, SSRF).
   - **Affected component(s)**: Specific REST endpoint, controller, frontend component, or configuration.
   - **Step-by-step reproduction instructions**: Proof of concept (PoC) scripts, cURL commands, or HTTP request payloads.
   - **Estimated severity / impact assessment**.
   - Any proposed remediation or patch if available.

### ⏱️ Response Time & SLA
- **Initial Acknowledgment**: Within **24 to 48 hours**.
- **Assessment & Triage**: Within **3 business days**.
- **Patch & Fix Deployment**: Critical severity issues will be prioritized for immediate remediation and tagged in a patch release.
- **Public Disclosure**: We follow coordinated vulnerability disclosure. Please allow us reasonable time to release a patch before any public disclosure.

---

## 🔐 Zero-Credential & Secret Safety Standards

Fairmacs LMS adheres to a strict **Zero-Credential-in-Code** standard across all branches and commits:

1. **No Hardcoded Secrets**:
   - Database credentials, API tokens, JWT secrets, and OAuth client secrets must **never** be hardcoded in application source code or committed to Git.
   - All production configurations must be injected dynamically via environment variables (`SUPABASE_DB_URL`, `SUPABASE_DB_PASSWORD`, `JWT_SECRET`, `ZOHO_CLIENT_SECRET`, etc.).

2. **Local Environment Protection**:
   - Local configuration files (`application-local.properties`, `.env`, `.env.local`) are strictly registered in `.gitignore` and must never be tracked.
   - Example templates (`application.properties.example`, `.env.example`) contain only sanitized placeholder values.

3. **Data Dumps & Backups Exclusion**:
   - Database dumps (`*.dump`, `*.sql`, `*.bak`) and user-uploaded media (`backend/uploads/`) must never be committed to source control.

---

## 🛡️ Security Architecture & Best Practices

- **Authentication**: Stateless HMAC-SHA-256 signed JSON Web Tokens (JWT) with strict token expiration and signature validation on every protected API call.
- **Password Security**: Passwords are salted and hashed using **BCrypt** with strong work factors. Plaintext passwords are never logged, stored, or transmitted back to clients.
- **Role-Based Access Control (RBAC)**: All sensitive administrative endpoints enforce Spring Security method-level authorization (`@PreAuthorize("hasRole(...)")`).
- **Cloud OAuth Token Encryption**: Third-party OAuth tokens (e.g., Zoho WorkDrive refresh tokens) are encrypted at rest using **AES-256-GCM** before database persistence.
- **Secure File Ingestion**: Uploaded documents (PDF, DOCX) and spreadsheets (`.xlsx`) undergo MIME validation, payload size restrictions (10MB default limit), and strict type verification.
- **CORS & CSRF**: Controlled CORS whitelist restricting requests to verified client domains, with stateless Bearer authentication mitigating CSRF risks.

---

## 📦 Dependency Scanning & Vulnerability Management

We recommend that all contributors and operators run regular automated dependency audits:

```bash
# Frontend vulnerability check
cd frontend
npm audit

# Backend dependency verification
cd backend
mvn dependency:resolve
```
