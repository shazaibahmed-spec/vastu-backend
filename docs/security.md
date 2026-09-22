# Security, Privacy & Compliance Architecture

## 1. Threat Model & Security Posture

The Vastu AI platform processes sensitive photographic captures of private residential and executive spaces. The security architecture enforces defense-in-depth across authentication, transport, file storage, AI integration, and database access.

```
                   ┌─────────────────────────────────────────┐
                   │               Threat Model              │
                   └────────────────────┬────────────────────┘
                                        │
     ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
     ▼                  ▼                               ▼                  ▼
Unauthorized       Malicious File               Prompt Injection       Data Leakage
Access / IDOR      Payloads (Polyglots)         & Jailbreaking         (PII / Photos)
     │                  │                               │                  │
     ▼                  ▼                               ▼                  ▼
JWT Bearer Auth    Sharp Re-encoding            XML Delimiters +       Private S3 +
& Role Guards      + Magic Byte Check           Strict Zod Schemas     Pre-signed URLs
```

---

## 2. Authentication & Authorization

### 2.1. JWT Token Lifecycle
- **Access Tokens**: Short-lived (15 minutes). Cryptographically signed using HMAC-SHA256 (`HS256`) or asymmetric `RS256`.
- **Refresh Tokens**: Long-lived (14 days). Stored in the database as salted SHA-256 hashes.
- **Refresh Rotation**: Every refresh request invalidates the old refresh token and issues a new pair. If a revoked refresh token is presented, all refresh tokens for that user are immediately invalidated (compromise detection).

### 2.2. Password Hashing
- Passwords are salted and hashed using **bcrypt** with a work factor of 12 rounds or **Argon2id**.
- Minimum password requirements: 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character.

### 2.3. Ownership & IDOR Protection
- Endpoints accessing analyses (`GET /api/v1/analysis/:id`, `DELETE /api/v1/analysis/:id`) enforce tenant isolation.
- Users can only query or mutate resources where `analysis.userId === request.user.id`. Administrators can override for auditing.

---

## 3. Media Ingestion & File Upload Security

Uploaded photos represent the largest attack surface for remote code execution (RCE) and cross-site scripting (XSS).

### 3.1. Strict Magic-Byte Inspection
Client-sent `Content-Type` headers and file extensions are completely ignored during validation. The server inspects the first 512 bytes of the buffer for signature magic bytes:
- `JPEG`: `FF D8 FF`
- `PNG`: `89 50 4E 47 0D 0A 1A 0A`
- `WebP`: `52 49 46 46 ... 57 45 42 50`
- `HEIC`: `ftypheic` / `ftypmif1`

All other payloads (including SVG, HTML, PHP, or ZIP polyglots) are rejected with `HTTP 415 Unsupported Media Type`.

### 3.2. Sanitization & Re-encoding Pipeline
1. All images are passed through the native **Sharp** C++ pipeline.
2. The image is parsed, normalized for EXIF orientation, and re-encoded into optimized WebP/JPEG formats.
3. **EXIF Stripping**: All embedded metadata (including camera serial numbers, user names, and especially **GPS coordinates**) is permanently purged.
4. **Pre-AI Image Quality Screening**: Pixel statistics assess exposure (darkness/overexposure), blur, extreme aspect ratios, and minimum resolution to reject unusable images before invocation of external AI models.
5. Any embedded executable payload or malformed chunk triggers a decoding error and immediate request termination.

### 3.3. Private Storage & Zero Public Exposure
- Storage buckets (AWS S3, Cloudflare R2, MinIO) block all public read/write ACLs.
- Raw image binary buffers and S3 pre-signed temporal tokens are never written to application logs.
- Images are accessible exclusively via short-lived (15-minute expiration) **Pre-signed URLs** generated on-the-fly for authenticated users.

---

## 4. API & Network Hardening

### 4.1. Security Headers (Helmet.js)
```typescript
app.use(
  helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  }),
);
```

### 4.2. Rate Limiting (`@nestjs/throttler`)
- **Global API**: Max 100 requests per 60 seconds per IP.
- **Authentication Routes (`/auth/*`)**: Max 5 requests per 60 seconds per IP to prevent brute-force attacks.
- **Analysis Ingestion (`POST /analysis`)**: Max 10 uploads per 60 seconds per user to prevent AI quota exhaustion and DoS.

### 4.3. CORS Policy
- Explicit origin whitelisting (`ALLOWED_ORIGINS=https://app.vastu.ai`). Wildcards (`*`) are disallowed when credentials are true.

---

## 5. AI Prompt Injection & Data Privacy

### 5.1. Prompt Injection Defense
User-supplied input (such as `notes`) is sanitized and wrapped within explicit structural boundary delimiters:
```text
<user_notes>
{{sanitizedUserNotes}}
</user_notes>
```
System instructions explicitly state that any instructions or code inside `<user_notes>` must be treated strictly as passive text data and never as command directives.

### 5.2. Strict Schema Validation on AI Responses
Regardless of what an LLM or Vision AI returns, the data cannot enter the domain layer without passing strict **Zod** schema parsing. Any extra properties or unexpected types are discarded or rejected.

---

## 6. Secrets Management & Operational Security

1. **No Secrets in Source Control**:
   - `.gitignore` prevents tracking `.env`, `*.pem`, `*.key`, or credentials.
   - `.env.example` provides template variables with empty or safe placeholder values.
2. **Environment Variable Validation**:
   - The application fails to boot if required secrets (`DATABASE_URL`, `JWT_SECRET`, `AI_API_KEY`) are missing or fail Joi/Zod validation at startup.
3. **Structured Logging Privacy**:
   - Logging interceptors automatically mask fields matching `password`, `token`, `authorization`, `cookie`, `imageBuffer`, and `presignedUrl`.
