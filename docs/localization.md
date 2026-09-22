# Multilingual Architecture & Localization Specification

## 1. Executive Summary

Vastu AI is architected from the ground up with a production-grade, extensible multilingual system supporting **10 Indian languages and English**. The architecture enforces a strict architectural boundary between:
1. **Static UI Localization**: Bundled client-side in the React Native mobile application for instant UI rendering and zero AI operational cost.
2. **AI-Generated Dynamic Vastu Content**: Synthesized on-demand by LLM providers in the user's requested language based on deterministic, language-independent Vastu rule evaluation outputs.

---

## 2. Supported Languages

| Language | ISO 639-1 Code | Native Script Name | Script Family | Default Direction |
| :--- | :--- | :--- | :--- | :--- |
| **English** | `en` | English | Latin | LTR |
| **Hindi** | `hi` | हिन्दी | Devanagari | LTR |
| **Tamil** | `ta` | தமிழ் | Tamil | LTR |
| **Telugu** | `te` | తెలుగు | Telugu | LTR |
| **Kannada** | `kn` | ಕನ್ನಡ | Kannada | LTR |
| **Malayalam** | `ml` | മലയാളം | Malayalam | LTR |
| **Bengali** | `bn` | বাংলা | Bengali-Assamese | LTR |
| **Gujarati** | `gu` | ગુજરાતી | Gujarati | LTR |
| **Marathi** | `mr` | मराठी | Devanagari | LTR |
| **Punjabi** | `pa` | ਪੰਜਾਬੀ | Gurmukhi | LTR |

---

## 3. Centralized Source of Truth

To eliminate code duplication, drift, and fragmentation across frontend and backend modules, language constants are centrally defined.

### 3.1. Backend Source of Truth (`backend/src/common/constants/index.ts`)
```typescript
export enum SupportedLanguageEnum {
  ENGLISH = 'en',
  HINDI = 'hi',
  TAMIL = 'ta',
  TELUGU = 'te',
  KANNADA = 'kn',
  MALAYALAM = 'ml',
  BENGALI = 'bn',
  GUJARATI = 'gu',
  MARATHI = 'mr',
  PUNJABI = 'pa',
}

export type SupportedLanguage = `${SupportedLanguageEnum}`;

export const DEFAULT_LANGUAGE = SupportedLanguageEnum.ENGLISH;

export const SUPPORTED_LANGUAGES: ReadonlyArray<SupportedLanguageEnum> = Object.freeze(
  Object.values(SupportedLanguageEnum),
);
```

### 3.2. Frontend Source of Truth (`app/src/i18n/types.ts`)
```typescript
export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'bn'
  | 'gu'
  | 'mr'
  | 'pa';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}
```

---

## 4. Separation of Concerns: UI vs AI Content

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. STATIC UI LOCALIZATION (Mobile App Bundles)                              │
│    - Navigation tabs, button labels, screen titles                          │
│    - Form validation errors, dialog alerts, status indicators               │
│    - Managed client-side via JSON dictionaries in app/src/i18n/locales/     │
│    - ZERO calls to AI for static strings (Fast, deterministic, zero cost)   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. DETERMINISTIC VASTU RULES ENGINE (Language-Agnostic Core)                │
│    - Evaluates geometric angles, spatial octants, and elemental matrices    │
│    - Emits immutable ASCII codes: ruleCode, severity, remedyType            │
│    - ZERO language logic inside the rules engine                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Fed into
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. DYNAMIC AI CONTENT LOCALIZATION (Backend LLM Pipeline)                   │
│    - User requests language code (e.g., 'hi', 'ta', 'bn')                   │
│    - Validated against SupportedLanguageEnum at DTO boundary                │
│    - Backend prompt system instructs LLM to produce structured JSON         │
│      in the target language                                                 │
│    - Output is validated against Zod ExplanationResultSchema                │
│    - Internal IDs and rule codes remain untouched                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. What Must NEVER Be Translated

To ensure database integrity, analytics consistency, and stable API contracts, the following identifiers must **strictly remain language-independent ASCII constants**:
- Rule Codes (e.g., `BED-001-HEAD-POS`, `KIT-001-STOVE-SE`)
- Verdict Enums (`COMPLIANT`, `DEFECT`, `NEUTRAL`)
- Severity Enums (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- Remedy Type Enums (`STRUCTURAL`, `ELEMENTAL`, `DECORATIVE`, `COLOR`)
- Room Type Enums (`BEDROOM`, `LIVING_ROOM`, `KITCHEN`, `MAIN_ENTRANCE`, `OFFICE`)
- Direction Enums (`NORTH`, `NORTH_EAST`, `EAST`, `SOUTH_EAST`, etc.)
- Database IDs, UUIDs, foreign keys, and API envelope keys

---

## 6. Language Fallback & Resolution Hierarchy

When an analysis is processed or text is rendered, language is resolved deterministically using a 4-tier hierarchy:

```
1. Explicit Request Parameter (POST /api/v1/analysis body: { language: 'hi' })
   ↓ (If null/omitted)
2. Authenticated User Profile Preference (User.languageCode)
   ↓ (If guest or not set)
3. Client Application Device Locale (if supported)
   ↓ (If unsupported)
4. Default English Fallback ('en')
```

### AI Output Fallback
If an upstream AI provider fails to return valid target-language JSON:
1. The backend attempts automatic JSON repair.
2. If invalid, the provider retries.
3. If still unparseable, the system falls back to a deterministic, native multi-language template catalog containing pre-authored translations for each rule across all 10 supported languages.

---

## 7. Database Persistence & Auditability

### 7.1. User Table (`User`)
- `languageCode VARCHAR(10) NOT NULL DEFAULT 'en'`
- Persists user preferences across devices and sessions.
- Modifiable via `PATCH /api/v1/users/me/language`.

### 7.2. Analysis Table (`Analysis`)
- `languageCode VARCHAR(10) NOT NULL DEFAULT 'en'`
- `promptVersion VARCHAR(50) NULL` (tracks prompt template revision e.g. `explanation-v1.2.0`)
- `modelVersion VARCHAR(50) NULL` (tracks model name e.g. `gpt-4o-mini`)
- **Historical Immutability**: If a user runs an analysis in Hindi and later switches their app language to Tamil, the historical analysis remains in Hindi. Future analyses will be created in Tamil.

---

## 8. AI Prompt Architecture

The explanation system prompt is dynamically assembled with explicit linguistic constraints:

```typescript
export const buildExplanationSystemPrompt = (language: SupportedLanguageEnum): string => {
  const languageName = getLanguageDisplayName(language);
  return `You are an empathetic, authoritative classical Vastu Shastra architectural consultant.

CRITICAL LINGUISTIC REQUIREMENT:
You MUST respond EXCLUSIVELY in ${languageName} (ISO code: "${language}").
- Every explanation, remedy title, practical action, and summary must be fluently written in ${languageName} script.
- Do NOT translate or modify technical rule codes, severity enums, or verdict enums.
- Return ONLY a valid, parseable JSON object strictly conforming to the requested schema.`;
};
```

---

## 9. Mobile Application (React Native) Implementation

### 9.1. Directory Structure
```
app/src/i18n/
├── index.ts                # Centralized translation hook & translate function
├── types.ts                # Language types & options
├── useTranslation.ts       # Zustand store with AsyncStorage persistence & backend sync
└── locales/                # 10 locale dictionary files
    ├── en.json
    ├── hi.json
    ├── ta.json
    ├── te.json
    ├── kn.json
    ├── ml.json
    ├── bn.json
    ├── gu.json
    ├── mr.json
    └── pa.json
```

### 9.2. Usage in Components
```typescript
import { useTranslation } from '../../i18n';

export const MyComponent = () => {
  const { t, language, setLanguage } = useTranslation();

  return (
    <View>
      <Text>{t('home.title')}</Text>
      <Button title={t('common.save')} onPress={() => setLanguage('hi')} />
    </View>
  );
};
```

---

## 10. Indian Language Technical Requirements

1. **UTF-8 Everywhere**: Database connection strings, HTTP headers (`Content-Type: application/json; charset=utf-8`), loggers, and file writers must explicitly use UTF-8.
2. **Multi-Byte Unicode Length**: Never truncate Indic strings using raw byte slicing; use Unicode-aware segmenters or character-based splitting.
3. **Database Column Sizing**: `languageCode` uses `VARCHAR(10)` instead of a rigid Postgres Enum type. This enables adding an 11th language without requiring a database migration or table locks.
4. **Font Support**: Mobile UI uses system fonts which natively support Devanagari, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, and Gurmukhi scripts on iOS and Android.

---

## 11. Step-by-Step Guide: Adding an 11th Language (e.g., Odia `or`)

The system is designed so that adding a new language requires **zero architectural refactoring and zero database migrations**:

1. **Backend Constant**:
   - Add `ODIA = 'or'` to `SupportedLanguageEnum` in `backend/src/common/constants/index.ts`.
2. **Backend AI Prompt**:
   - Add Odia to the `LANGUAGE_DISPLAY_NAMES` map in `explanation-prompt.template.ts`.
3. **Frontend Types & Locales**:
   - Add `'or'` to `SupportedLanguage` union in `app/src/i18n/types.ts`.
   - Add Odia to `SUPPORTED_LANGUAGES` array in `app/src/i18n/types.ts`.
   - Create `app/src/i18n/locales/or.json` copying keys from `en.json`.
   - Register `or.json` in `app/src/i18n/index.ts`.
4. **Testing**:
   - Add `'or'` to the parameterized test array in `backend/test/unit/multilingual/multilingual.spec.ts`.
   - Run `npm test` to verify validation, schema compliance, and fallback.
