# REST API Contract Specification (v1)

- **Base URL**: `/api/v1`
- **Protocol**: HTTPS
- **Data Format**: JSON (`application/json`) / Multipart Form (`multipart/form-data`)
- **Authentication**: Bearer Token (`Authorization: Bearer <JWT_ACCESS_TOKEN>`)
- **Tracing Header**: `x-request-id` (UUIDv4) echoed back in every response.

---

## 1. Standard Response & Error Envelopes

### 1.1. Success Response Wrapper
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-10T11:50:00.000Z",
    "correlationId": "d3b07384-d113-494d-91b5-857c0a969bfd"
  }
}
```

### 1.2. Paginated Response Wrapper
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 48,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": {
    "timestamp": "2026-09-10T11:50:00.000Z",
    "correlationId": "d3b07384-d113-494d-91b5-857c0a969bfd"
  }
}
```

### 1.3. Error Response Wrapper
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Compass heading must be a valid angle between 0 and 360.",
  "code": "INVALID_COMPASS_HEADING",
  "timestamp": "2026-09-10T11:50:00.000Z",
  "path": "/api/v1/analysis",
  "correlationId": "d3b07384-d113-494d-91b5-857c0a969bfd"
}
```

---

## 2. Authentication Endpoints

### 2.1. Register User
`POST /api/v1/auth/register`

#### Request
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Doe"
}
```

#### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_9918231",
      "email": "user@example.com",
      "name": "Jane Doe",
      "createdAt": "2026-09-10T11:50:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresIn": 3600
    }
  }
}
```

### 2.2. Login User
`POST /api/v1/auth/login`

#### Request
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Response: `200 OK`
Same payload as Register.

### 2.3. Refresh Access Token
`POST /api/v1/auth/refresh`

#### Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

#### Response: `200 OK`
Returns a new `accessToken` and rotated `refreshToken`.

### 2.4. Get Current User Profile
`GET /api/v1/users/me`
- **Security**: Bearer JWT

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "usr_9918231",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "USER",
    "languageCode": "hi",
    "createdAt": "2026-09-10T11:50:00.000Z"
  }
}
```

### 2.5. Update Language Preference
`PATCH /api/v1/users/me/language`
- **Security**: Bearer JWT

#### Request
```json
{
  "language": "hi"
}
```

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "usr_9918231",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "USER",
    "languageCode": "hi",
    "createdAt": "2026-09-10T11:50:00.000Z"
  }
}
```

---

## 3. Analysis Endpoints

### 3.1. Create and Execute Analysis
`POST /api/v1/analysis`
- **Content-Type**: `multipart/form-data`
- **Security**: Bearer JWT

#### Form Data Fields
| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image` | Binary File | Yes | JPEG, PNG, WebP, or HEIC image file (Max 10MB) |
| `roomType` | String Enum | Yes | `BEDROOM`, `LIVING_ROOM`, `KITCHEN`, `MAIN_ENTRANCE`, `OFFICE` |
| `directionSource` | String Enum | Yes | `DEVICE_COMPASS`, `USER_SELECTED`, `UNKNOWN` |
| `compassHeading` | Float | Optional* | Heading in degrees (`0.0` to `359.9`). *Required if `directionSource=DEVICE_COMPASS` |
| `userSelectedDirection` | String Enum | Optional* | Cardinal/ordinal direction. *Required if `directionSource=USER_SELECTED` |
| `language` | String Enum | Optional | `en`, `hi`, `ta`, `te`, `kn`, `ml`, `bn`, `gu`, `mr`, `pa` (Defaults to user preference or `en`) |
| `notes` | String | Optional | Max 500 characters user context |

#### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "anl_823190ab",
    "status": "COMPLETED",
    "language": "hi",
    "roomType": "KITCHEN",
    "orientation": {
      "source": "DEVICE_COMPASS",
      "heading": 135.0,
      "direction": "SOUTH_EAST",
      "isCalibrated": true
    },
    "overallScore": 88,
    "scoreBand": "EXCELLENT",
    "image": {
      "url": "https://storage.vastu.ai/images/anl_823190ab.webp",
      "width": 1920,
      "height": 1080
    },
    "elementalBalance": {
      "fire": "BALANCED",
      "water": "BALANCED",
      "earth": "NEUTRAL",
      "air": "NEUTRAL",
      "space": "BALANCED"
    },
    "detectedObjects": [
      {
        "id": "obj_01",
        "type": "gas_stove",
        "objectType": "gas_stove",
        "label": "Cooking Range",
        "zone": "SOUTH_EAST",
        "confidence": 0.96,
        "detectionStatus": "DETECTED",
        "relativePosition": { "x": 0.72, "y": 0.60 },
        "boundingBox": { "x": 0.60, "y": 0.50, "width": 0.24, "height": 0.20 }
      },
      {
        "id": "obj_02",
        "type": "sink",
        "objectType": "sink",
        "label": "Water Sink",
        "zone": "NORTH_EAST",
        "confidence": 0.91,
        "detectionStatus": "DETECTED",
        "relativePosition": { "x": 0.20, "y": 0.55 },
        "boundingBox": { "x": 0.10, "y": 0.45, "width": 0.20, "height": 0.20 }
      }
    ],
    "findings": [
      {
        "id": "fnd_01",
        "ruleCode": "KIT-001-STOVE-SE",
        "category": "FIRE_ELEMENT",
        "verdict": "COMPLIANT",
        "severity": "LOW",
        "title": "Stove in Agni (Fire) Corner",
        "description": "The gas stove is optimally located in the South-East zone, fostering vitality and digestive health.",
        "remedies": []
      },
      {
        "id": "fnd_02",
        "ruleCode": "KIT-002-SINK-SEPARATION",
        "category": "ELEMENTAL_CLASH",
        "verdict": "COMPLIANT",
        "severity": "LOW",
        "title": "Proper Separation of Fire and Water",
        "description": "The sink and stove are placed in distinct zones, avoiding fire-water opposition.",
        "remedies": []
      }
    ],
    "aiSummary": "Your kitchen demonstrates excellent alignment with Vastu principles. The cooking stove sits harmoniously in the South-East (Agni) zone, and the water element is safely segregated.",
    "imageQualityScore": 0.92,
    "visionModelUsed": "gemini-3.5-flash",
    "visionDurationMs": 1420,
    "createdAt": "2026-09-10T12:00:00.000Z",
    "completedAt": "2026-09-10T12:00:03.450Z"
  },
  "meta": {
    "executionTimeMs": 3450,
    "correlationId": "8f3b207a-2601-447b-9447-7501b447cb02"
  }
}
```

### 3.2. Get Analysis Details
`GET /api/v1/analysis/:id`
- **Security**: Bearer JWT (Owner only or Admin)

#### Response: `200 OK`
Returns the exact structure of `201 Created` above.

### 3.3. Get Analysis History (Paginated)
`GET /api/v1/analysis?page=1&limit=10&roomType=KITCHEN`
- **Security**: Bearer JWT

#### Query Parameters
- `page` (integer, default: 1)
- `limit` (integer, default: 10, max: 50)
- `roomType` (string enum, optional filter)
- `status` (string enum, optional filter)

#### Response: `200 OK`
Returns `PaginatedResponseWrapper` containing summary cards of analyses:
```json
{
  "success": true,
  "data": [
    {
      "id": "anl_823190ab",
      "roomType": "KITCHEN",
      "status": "COMPLETED",
      "language": "hi",
      "overallScore": 88,
      "thumbnailUrl": "https://storage.vastu.ai/thumbnails/anl_823190ab.webp",
      "direction": "SOUTH_EAST",
      "createdAt": "2026-09-10T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### 3.4. Soft Delete Analysis
`DELETE /api/v1/analysis/:id`
- **Security**: Bearer JWT (Owner only)

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Analysis successfully removed."
  }
}
```

### 3.5. Retry Failed Analysis
`POST /api/v1/analysis/:id/retry`
- **Security**: Bearer JWT (Owner only)
- Triggers re-execution for analyses with status `FAILED_AI_ANALYSIS` or `FAILED_REPORT_GENERATION` without re-uploading image.

#### Response: `200 OK`
Returns updated Analysis object progressing through the state machine.

### 3.6. Stream Stored Image / Asset
`GET /api/v1/storage/:key`
- **Security**: Public / Client access (path traversal protected)
- Streams sanitized WebP, JPEG, PNG, or PDF files.
- Response Headers:
  - `Content-Type`: `image/webp` (or matching MIME)
  - `Cache-Control`: `public, max-age=31536000, immutable`

---

## 4. HTTP Status Code Reference

| Status Code | Reason | Meaning in Vastu AI |
| :--- | :--- | :--- |
| `200 OK` | Success | Request succeeded and returned resource |
| `201 Created` | Created | Analysis or User created successfully |
| `400 Bad Request` | Validation Failure | Invalid DTO, illegal enum value, missing required field |
| `401 Unauthorized` | Auth Failure | Missing, expired, or malformed JWT bearer token |
| `403 Forbidden` | Access Denied | User trying to read/delete someone else's analysis |
| `404 Not Found` | Not Found | Requested analysis ID does not exist or was deleted |
| `415 Unsupported Media` | File Format Error | Uploaded file magic bytes do not match JPEG/PNG/WebP/HEIC |
| `422 Unprocessable` | Domain Logic Error | Image quality too poor to analyze or uncalibrated compass |
| `429 Too Many Requests` | Throttling | Client exceeded rate limit thresholds |
| `500 Internal Error` | Server Exception | Unhandled runtime exception |
| `502 / 504 Gateway Error`| AI Provider Error | Upstream Vision or LLM service timeout/outage |
