# Vastu AI — Production-Grade Backend Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal.svg)](https://www.prisma.io/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-black.svg)]()

> A robust, deterministic, AI-augmented spatial analysis backend that evaluates architectural spaces according to classical Vastu Shastra principles.

---

## 🏛️ Architectural Philosophy

The core design principle of Vastu AI is **Strict Determinism with AI Augmentation**:

```
Photo + Compass Orientation + Room Type
                  │
                  ▼
         [ Vision AI Engine ]  ──► Factual detection (Objects, Positions, Orientations)
                  │
                  ▼
     [ Vastu Rules Engine ]    ──► Deterministic, mathematically verified rule evaluations
                  │
                  ▼
          [ LLM Engine ]       ──► Empathetic, contextual explanations and remedies
                  │
                  ▼
    Structured Vastu Report    ──► Mobile App UI (Score, Doshas, Remedies, Elemental Map)
```

1. **AI Never Invents Rules**: Authoritative Vastu principles are versioned, deterministic, and maintained in code and relational tables. The LLM is prohibited from synthesizing or fabricating Vastu rules on the fly.
2. **Vision AI as an Objective Observer**: Vision AI identifies what is present in the image (e.g., bed, gas stove, water dispenser, mirror, doorway) and maps them relative to compass coordinates.
3. **LLM as an Empathetic Translator**: The LLM consumes deterministic rule verdicts and translates them into constructive, actionable guidance.

---

## 🚀 Scope (Version 1)

### Supported Spaces
* **Bedroom** (Bed placement, head direction, mirror positioning, electricals)
* **Living Room** (Seating orientation, television, heavy furniture, light sources)
* **Kitchen** (Cooking stove zone, sink location, refrigerator, fire-water clash)
* **Main Entrance** (Door opening direction, obstructions, threshold alignment, lighting)
* **Office / Study** (Desk facing direction, chair support, window placement, bookshelf)

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | NestJS (v10+) | Enterprise modular TypeScript backend framework |
| **Language** | TypeScript (v5+) | Strict mode (`noImplicitAny`, strict null checks) |
| **Database** | PostgreSQL (v16+) | Relational storage for users, analyses, rules, reports |
| **ORM** | Prisma ORM | Type-safe query builder, schema modeling, versioned migrations |
| **Validation** | `class-validator` + Zod | Strict boundary DTO validation & AI schema validation |
| **Image Processing** | Sharp | Buffer inspection, metadata extraction, resizing, sanitization |
| **Documentation** | OpenAPI / Swagger | Interactive API contract and documentation |
| **Containerization**| Docker & Docker Compose | Containerized Postgres and local infrastructure |
| **Testing** | Jest + Supertest | Unit testing, integration testing, and E2E testing |

---

## 📁 Repository Structure

```
.
├── AGENTS.md                  # Comprehensive operating rules for coding agents
├── README.md                  # Project overview and local quick-start
├── docs/                      # Architectural and technical documentation
│   ├── architecture.md        # Modular Clean Architecture & data pipelines
│   ├── requirements.md        # Product requirements, edge cases, inputs/outputs
│   ├── api-contract.md        # Complete OpenAPI / REST endpoint specs
│   ├── database-design.md     # PostgreSQL schema, ERD, indexes, lifecycle states
│   ├── vastu-rules.md         # Deterministic rule definitions, schemas, and math
│   ├── ai-architecture.md     # Provider-agnostic Vision/LLM adapters & prompts
│   ├── security.md            # Auth, file validation, rate limiting, PII safety
│   ├── testing-strategy.md    # Unit, integration, E2E test plan & mock patterns
│   └── development-plan.md    # Phase-by-phase implementation roadmap
└── backend/                   # NestJS application source code
    ├── src/
    │   ├── common/            # Cross-cutting guards, filters, pipes, interceptors
    │   ├── config/            # Strongly-typed environment configurations
    │   ├── database/          # Prisma client and initial rule seeders
    │   └── modules/           # Domain feature modules (auth, vastu, analysis, ai, etc.)
    ├── prisma/                # Schema definitions and migrations
    ├── test/                  # E2E and integration test suites
    └── docker-compose.yml     # Local database and development services
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` / `v23.x`
- **npm**: `v10.x+`
- **Docker Desktop**: `v24+` (for PostgreSQL)

### 2. Environment Setup
```bash
cd backend
cp .env.example .env
# Edit .env to set your database credentials and AI API keys
```

### 3. Spin up Local PostgreSQL
```bash
docker compose up -d postgres
```

### 4. Install Dependencies & Migrate Database
```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run Development Server
```bash
npm run start:dev
```
Access the application at `http://localhost:3000`.
Access Swagger API documentation at `http://localhost:3000/api/docs`.

### 6. Run Tests
```bash
# Unit tests
npm run test

# Vastu Rules Engine test suite specifically
npm run test -- test/unit/vastu

# End-to-end tests
npm run test:e2e
```

---

## 📚 Technical Documentation Index

Detailed specifications and architectural guides are available in the [`docs/`](./docs) directory:

- [**System Overview & How It Works (Non-Tech & Tech)**](./docs/system-overview.md) ⭐
- [System Architecture](./docs/architecture.md)
- [Product & Technical Requirements](./docs/requirements.md)
- [REST API Contract & Endpoints](./docs/api-contract.md)
- [Database Schema & ERD](./docs/database-design.md)
- [Vastu Rules Engine & Mathematics](./docs/vastu-rules.md)
- [AI Vision & LLM Architecture](./docs/ai-architecture.md)
- [Security & Compliance Strategy](./docs/security.md)
- [Testing & Quality Assurance Strategy](./docs/testing-strategy.md)
- [Phased Development Plan](./docs/development-plan.md)

---

## 📄 License & Confidentiality
Proprietary software. All rights reserved.
