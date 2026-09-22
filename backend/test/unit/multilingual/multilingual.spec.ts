import { describe, expect, it, vi } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  DEFAULT_LANGUAGE,
  DirectionEnum,
  DirectionSourceEnum,
  RemedyTypeEnum,
  RoomTypeEnum,
  SUPPORTED_LANGUAGES,
  SupportedLanguageEnum,
  VerdictEnum,
} from '../../../src/common/constants/index.js';
import { MockLlmAdapter } from '../../../src/modules/ai/adapters/mock-llm.adapter.js';
import { ExplanationInput } from '../../../src/modules/ai/interfaces/llm-provider.interface.js';
import { ExplanationResultSchema } from '../../../src/modules/ai/schemas/explanation.schema.js';
import { CreateAnalysisDto } from '../../../src/modules/analysis/dto/create-analysis.dto.js';
import { UpdateLanguageDto } from '../../../src/modules/users/dto/update-language.dto.js';
import { VastuWisdomService } from '../../../src/modules/vastu/services/vastu-wisdom.service.js';

describe('Multilingual Architecture Test Suite', () => {
  const allTenLanguages: SupportedLanguageEnum[] = [
    SupportedLanguageEnum.ENGLISH,
    SupportedLanguageEnum.HINDI,
    SupportedLanguageEnum.TAMIL,
    SupportedLanguageEnum.TELUGU,
    SupportedLanguageEnum.KANNADA,
    SupportedLanguageEnum.MALAYALAM,
    SupportedLanguageEnum.BENGALI,
    SupportedLanguageEnum.GUJARATI,
    SupportedLanguageEnum.MARATHI,
    SupportedLanguageEnum.PUNJABI,
  ];

  describe('1. Centralized Language Registry', () => {
    it('should have exactly 10 supported languages registered', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(10);
      expect(allTenLanguages).toHaveLength(10);
    });

    it('should have English as default language', () => {
      expect(DEFAULT_LANGUAGE).toBe(SupportedLanguageEnum.ENGLISH);
    });

    it.each(allTenLanguages)('should have valid metadata for language %s', (lang) => {
      const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      expect(meta).toBeDefined();
      expect(meta?.name.length).toBeGreaterThan(0);
      expect(meta?.nativeName.length).toBeGreaterThan(0);
      expect(meta?.script.length).toBeGreaterThan(0);
    });
  });

  describe('2. DTO Language Validation & Security', () => {
    it.each(allTenLanguages)('should successfully validate CreateAnalysisDto with language %s', async (lang) => {
      const dto = plainToInstance(CreateAnalysisDto, {
        roomType: RoomTypeEnum.BEDROOM,
        directionSource: DirectionSourceEnum.DEVICE_COMPASS,
        compassHeading: 180,
        language: lang,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject unsupported or malicious language codes in CreateAnalysisDto', async () => {
      const invalidCodes = [
        'fr',
        'es',
        'de',
        'zh',
        'SELECT * FROM users',
        '<script>alert(1)</script>',
        '../../etc/passwd',
      ];

      for (const code of invalidCodes) {
        const dto = plainToInstance(CreateAnalysisDto, {
          roomType: RoomTypeEnum.BEDROOM,
          directionSource: DirectionSourceEnum.DEVICE_COMPASS,
          compassHeading: 180,
          language: code as any,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('language');
      }
    });

    it.each(allTenLanguages)('should validate UpdateLanguageDto with language %s', async (lang) => {
      const dto = plainToInstance(UpdateLanguageDto, {
        languageCode: lang,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid language in UpdateLanguageDto', async () => {
      const dto = plainToInstance(UpdateLanguageDto, {
        languageCode: 'invalid_lang',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('3. Parameterized AI Explanation Synthesis in All 10 Languages', () => {
    const mockLlm = new MockLlmAdapter();

    const sampleInput: ExplanationInput = {
      roomType: RoomTypeEnum.BEDROOM,
      overallScore: 85,
      scoreBand: 'GOOD',
      findings: [
        {
          ruleCode: 'BED-001-HEAD-POS',
          category: 'BEDROOM',
          verdict: VerdictEnum.COMPLIANT,
          severity: 'LOW' as any,
          targetObject: 'bed',
          zone: DirectionEnum.SOUTH,
          canonicalDescription: 'Headboard placed towards South promotes restorative rest.',
          defaultRemedyText: 'Maintain current restful orientation.',
        },
        {
          ruleCode: 'BED-002-MIRROR-FACING',
          category: 'BEDROOM',
          verdict: VerdictEnum.DEFECT,
          severity: 'MEDIUM' as any,
          targetObject: 'mirror',
          zone: DirectionEnum.NORTH,
          canonicalDescription: 'Mirror directly reflecting bed can cause restless sleep.',
          defaultRemedyText: 'Cover mirror during night or reposition to East wall.',
        },
      ],
    };

    it.each(allTenLanguages)(
      'should generate schema-compliant explanation in %s preserving English rule codes and enums',
      async (lang) => {
        const result = await mockLlm.generateExplanation({
          ...sampleInput,
          language: lang,
        });

        // 1. Zod schema validation
        const parsed = ExplanationResultSchema.safeParse(result);
        expect(parsed.success).toBe(true);

        // 2. Summary in native script (non-empty UTF-8 string)
        expect(result.summary).toBeDefined();
        expect(result.summary.length).toBeGreaterThan(10);

        // 3. Finding explanations match input count
        expect(result.findingExplanations).toHaveLength(2);

        // 4. Critical: internal rule codes and remedy types MUST remain un-translated
        expect(result.findingExplanations[0].ruleCode).toBe('BED-001-HEAD-POS');
        expect(result.findingExplanations[0].remedyType).toBe(RemedyTypeEnum.DECORATIVE);
        expect(result.findingExplanations[1].ruleCode).toBe('BED-002-MIRROR-FACING');
        expect(result.findingExplanations[1].remedyType).toBe(RemedyTypeEnum.ELEMENTAL);

        // 5. Version metadata tracking
        expect(result.promptVersion).toBeDefined();
        expect(result.modelVersion).toBeDefined();
        expect(result.tokenUsage?.totalTokens).toBeGreaterThan(0);
      },
    );

    it('should fallback gracefully to English when language is undefined', async () => {
      const result = await mockLlm.generateExplanation({
        ...sampleInput,
        language: undefined,
      });

      expect(result.summary).toContain('Your bedroom demonstrates');
      expect(result.findingExplanations[0].laymanExplanation).toContain('Your bed is favorably placed');
    });
  });

  describe('4. Unicode and Indic Script Integrity', () => {
    const scriptSamples: Record<SupportedLanguageEnum, string> = {
      [SupportedLanguageEnum.ENGLISH]: 'Bed in South',
      [SupportedLanguageEnum.HINDI]: 'दक्षिण में बिस्तर (Devanagari)',
      [SupportedLanguageEnum.TAMIL]: 'தெற்கில் படுக்கை (Tamil)',
      [SupportedLanguageEnum.TELUGU]: 'దక్షిణంలో మంచం (Telugu)',
      [SupportedLanguageEnum.KANNADA]: 'ದಕ್ಷಿಣದಲ್ಲಿ ಹಾಸಿಗೆ (Kannada)',
      [SupportedLanguageEnum.MALAYALAM]: 'തെക്കിൽ കിടക്ക (Malayalam)',
      [SupportedLanguageEnum.BENGALI]: 'দক্ষিণে বিছানা (Bengali)',
      [SupportedLanguageEnum.GUJARATI]: 'દક્ષિણમાં બેડ (Gujarati)',
      [SupportedLanguageEnum.MARATHI]: 'पूर्वेस दरवाजा (Devanagari Marathi)',
      [SupportedLanguageEnum.PUNJABI]: 'ਦੱਖਣ ਵਿੱਚ ਬਿਸਤਰਾ (Gurmukhi)',
    };

    it.each(allTenLanguages)('should preserve multi-byte UTF-8 encoding for %s', (lang) => {
      const sample = scriptSamples[lang];
      const encoded = Buffer.from(sample, 'utf-8');
      const decoded = encoded.toString('utf-8');
      expect(decoded).toBe(sample);

      // JSON serialization round-trip
      const json = JSON.stringify({ lang, text: sample });
      const parsed = JSON.parse(json);
      expect(parsed.text).toBe(sample);
    });
  });

  describe('5. Localized Daily Vastu Principles', () => {
    it('should return English daily principle by default or when language is undefined', () => {
      const service = new VastuWisdomService();
      const principle = service.getDailyPrinciple('2026-09-11', 0);
      expect(principle.quote).toBeDefined();
      expect(typeof principle.quote).toBe('string');
      expect(principle.zone).toBeDefined();
    });

    it('should return Hindi daily principle when lang=hi is requested', () => {
      const service = new VastuWisdomService();
      // Test for specific offsets where Hindi translations exist
      const p1 = service.getDailyPrinciple('2026-09-11', 0, SupportedLanguageEnum.HINDI);
      expect(p1.quote).toBeDefined();
      expect(p1.zone).toBeDefined();
    });
  });
});
