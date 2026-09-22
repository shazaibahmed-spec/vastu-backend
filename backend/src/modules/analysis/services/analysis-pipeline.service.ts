import { Inject, Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';
import {
  AnalysisStatusEnum,
  DirectionEnum,
  RoomTypeEnum,
  SupportedLanguageEnum,
} from '../../../common/constants/index.js';
import { CONFIDENCE_LOW } from '../../../common/constants/vision.constants.js';
import { ImageQualityInsufficientException } from '../../../common/exceptions/domain.exception.js';
import { PrismaService } from '../../../database/prisma.service.js';
import {
  LLM_PROVIDER_TOKEN,
  VISION_PROVIDER_TOKEN,
} from '../../ai/ai.module.js';
import type { LLMProvider } from '../../ai/interfaces/llm-provider.interface.js';
import type { VisionProvider } from '../../ai/interfaces/vision-provider.interface.js';
import { StorageService } from '../../storage/services/storage.service.js';
import { VastuRulesEngine } from '../../vastu/engine/vastu-rules-engine.js';
import { EvaluatedObjectFact } from '../../vastu/types/evaluation-context.js';
import { AnalysisResponseDto } from '../dto/analysis-response.dto.js';
import { CreateAnalysisDto } from '../dto/create-analysis.dto.js';
import { AnalysisService } from './analysis.service.js';

@Injectable()
export class AnalysisPipelineService {
  private readonly logger = new Logger(AnalysisPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: AnalysisService,
    private readonly storageService: StorageService,
    private readonly vastuRulesEngine: VastuRulesEngine,
    @Inject(VISION_PROVIDER_TOKEN)
    private readonly visionProvider: VisionProvider,
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: LLMProvider,
  ) {}

  /**
   * Executes the full end-to-end analysis pipeline:
   * Upload -> Vision Detection -> Deterministic Rules Engine -> LLM Explanation -> Final Report.
   */
  async executePipeline(
    userId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    dto: CreateAnalysisDto,
  ): Promise<AnalysisResponseDto> {
    const { heading, direction } = this.analysisService.resolveDirection(dto);

    // 1. Deduplication check via SHA-256 hash (scoped to roomType, direction, and 15s throttle)
    const inputHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    const recentDuplicate = await this.findRecentDuplicateAnalysis(
      userId,
      inputHash,
      dto.roomType as RoomTypeEnum,
      direction,
    );

    if (recentDuplicate) {
      this.logger.log(
        `Returning existing completed analysis ${recentDuplicate.id} for duplicate scan request.`,
      );
      return this.analysisService.getAnalysisById(recentDuplicate.id, userId);
    }

    // 2. Resolve language preference (DTO -> User profile -> English default)
    let targetLanguage = dto.language;
    if (!targetLanguage && userId && userId !== '00000000-0000-0000-0000-000000000001') {
      const user = await this.prisma.user?.findUnique?.({
        where: { id: userId },
        select: { languageCode: true },
      });
      if (user?.languageCode) {
        targetLanguage = user.languageCode as SupportedLanguageEnum;
      }
    }
    const resolvedLanguage = targetLanguage || SupportedLanguageEnum.ENGLISH;

    // 2. Pre-AI image quality assessment using Sharp pixel statistics
    if (this.storageService.assessImageQuality) {
      const qualityReport = await this.storageService.assessImageQuality(fileBuffer);
      if (!qualityReport.usable) {
        this.logger.warn(
          `Image rejected before AI analysis: score=${qualityReport.score}, issues=${qualityReport.issues.join(', ')}`,
        );
        throw new ImageQualityInsufficientException(
          qualityReport.issues,
          qualityReport.score,
        );
      }
    }

    // 3. Initialize analysis aggregate in PENDING state
    const analysisId = await this.analysisService.createAnalysisIntent(
      userId,
      dto,
      resolvedLanguage,
    );

    try {
      // 3. Image Sanitization & Storage
      const stored = await this.storageService.processAndStoreImage(
        fileBuffer,
        originalFilename,
      );

      await this.prisma.analysisImage.create({
        data: {
          analysisId,
          storageKey: stored.uploadResult.storageKey,
          originalFilename,
          mimeType: stored.processedImage.mimeType,
          sizeBytes: stored.processedImage.sizeBytes,
          width: stored.processedImage.width,
          height: stored.processedImage.height,
          sha256Hash: stored.processedImage.sha256Hash,
        },
      });

      await this.analysisService.transitionState(
        analysisId,
        AnalysisStatusEnum.IMAGE_UPLOADED,
      );

      // 4. Vision AI Detection
      await this.analysisService.transitionState(
        analysisId,
        AnalysisStatusEnum.AI_ANALYSIS,
      );

      let visionResult;
      try {
        visionResult = await this.visionProvider.analyzeImage({
          imageBuffer: stored.processedImage.processedBuffer,
          mimeType: stored.processedImage.mimeType,
          roomType: dto.roomType,
          headingDegrees: heading,
          calibratedDirection: direction,
        });
      } catch (err: any) {
        await this.analysisService.transitionState(
          analysisId,
          AnalysisStatusEnum.FAILED_AI_ANALYSIS,
        );
        throw err;
      }

      // Check room type discrepancy between user declared and AI detected
      if (
        visionResult.roomTypeDetected &&
        visionResult.roomTypeDetected !== dto.roomType &&
        (visionResult.roomTypeConfidence ?? 0) >= 0.8
      ) {
        this.logger.warn(
          `Analysis ${analysisId}: Room type discrepancy detected. User declared '${dto.roomType}', but vision model detected '${visionResult.roomTypeDetected}' with confidence ${visionResult.roomTypeConfidence}`,
        );
      }

      // Persist detected objects with bounding boxes and detection status
      const createdObjects = await Promise.all(
        visionResult.detectedObjects.map((obj) =>
          this.prisma.detectedObject.create({
            data: {
              analysisId,
              objectType: obj.objectType,
              label: obj.label,
              zone: obj.zone as any,
              relativePosition: obj.relativePosition,
              confidence: obj.confidence,
              boundingBox: obj.boundingBox as any,
              detectionStatus: obj.detectionStatus || 'DETECTED',
              attributesJson: obj.attributes as Record<string, any>,
            },
          }),
        ),
      );

      await this.analysisService.transitionState(
        analysisId,
        AnalysisStatusEnum.OBJECT_DETECTION,
      );

      // 5. Deterministic Vastu Rules Evaluation
      await this.analysisService.transitionState(
        analysisId,
        AnalysisStatusEnum.RULE_EVALUATION,
      );

      // Filter low-confidence detections below threshold to avoid false positive defects
      const evaluatedFacts: EvaluatedObjectFact[] = createdObjects
        .filter((obj) => obj.confidence >= CONFIDENCE_LOW)
        .map((obj) => ({
          id: obj.id,
          objectType: obj.objectType,
          label: obj.label,
          zone: obj.zone as DirectionEnum,
          relativePosition: obj.relativePosition as { x: number; y: number },
          confidence: obj.confidence,
          attributes: (obj.attributesJson as Record<string, any>) || {},
        }));

      let evaluationResult;
      try {
        evaluationResult = this.vastuRulesEngine.evaluate({
          roomType: dto.roomType,
          detectedRoomType: visionResult.roomTypeDetected,
          isArchitecturalSpace:
            visionResult.qualityAssessment?.isArchitecturalSpace,
          primaryDirection: direction,
          headingDegrees: heading,
          detectedObjects: evaluatedFacts,
          layoutObservations: visionResult.observations,
        });
      } catch (err: any) {
        await this.analysisService.transitionState(
          analysisId,
          AnalysisStatusEnum.FAILED_RULE_EVALUATION,
        );
        throw err;
      }

      // Persist findings and remedies
      for (const finding of evaluationResult.findings) {
        // Ensure rule reference exists in database
        let rule = await this.prisma.vastuRule.findFirst({
          where: { code: finding.ruleCode },
        });

        if (!rule) {
          const ruleVersionId =
            await this.analysisService.getOrCreateCurrentRuleVersion();
          rule = await this.prisma.vastuRule.create({
            data: {
              versionId: ruleVersionId,
              code: finding.ruleCode,
              roomType: dto.roomType as any,
              category: 'GENERAL',
              name: finding.ruleName,
              description: finding.reason,
              targetObject: 'general',
              conditionJson: {},
              severity: finding.severity as any,
              verdictOnMatch: finding.verdict as any,
              defaultRemedy: finding.defaultRemedy || 'Consult a Vastu expert.',
              isActive: true,
            },
          });
        }

        const createdFinding = await this.prisma.analysisFinding.create({
          data: {
            analysisId,
            ruleId: rule.id,
            detectedObjectId: finding.matchedObjectId,
            verdict: finding.verdict as any,
            severity: finding.severity as any,
            rawReason: finding.reason,
          },
        });

        if (finding.defaultRemedy) {
          await this.prisma.remedy.create({
            data: {
              findingId: createdFinding.id,
              title: `${finding.ruleName} Remedy`,
              description: finding.defaultRemedy,
              remedyType: finding.remedyType as any,
              priority: 1,
              isAiGenerated: false,
            },
          });
        }
      }

      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          overallScore: evaluationResult.overallScore,
          visionModelUsed:
            visionResult.processingMetadata?.modelName ||
            visionResult.rawModelName ||
            null,
          visionPromptVersion:
            visionResult.processingMetadata?.promptVersion || null,
          visionDurationMs:
            visionResult.processingMetadata?.processingDurationMs || null,
          imageQualityScore: visionResult.qualityAssessment?.score ?? null,
        },
      });

      // 6. LLM Empathetic Explanation & Report Generation
      await this.analysisService.transitionState(
        analysisId,
        AnalysisStatusEnum.REPORT_GENERATION,
      );

      let explanationResult;
      try {
        explanationResult = await this.llmProvider.generateExplanation({
          roomType: dto.roomType,
          overallScore: evaluationResult.overallScore,
          scoreBand: evaluationResult.scoreBand,
          findings: evaluationResult.findings.map((f) => ({
            ruleCode: f.ruleCode,
            category: f.category,
            verdict: f.verdict,
            severity: f.severity,
            targetObject: f.targetObject,
            zone: f.zone,
            canonicalDescription: f.reason,
            defaultRemedyText: f.defaultRemedy,
          })),
          userNotes: dto.notes,
          language: resolvedLanguage,
        });
      } catch (err: any) {
        await this.analysisService.transitionState(
          analysisId,
          AnalysisStatusEnum.FAILED_REPORT_GENERATION,
        );
        throw err;
      }

      // Update findings with localized explanations and remedies
      for (const exp of explanationResult.findingExplanations) {
        const findingToUpdate = await this.prisma.analysisFinding.findFirst({
          where: {
            analysisId,
            rule: { code: exp.ruleCode },
          },
        });
        if (findingToUpdate) {
          await this.prisma.analysisFinding.update({
            where: { id: findingToUpdate.id },
            data: { rawReason: exp.laymanExplanation },
          });

          await this.prisma.remedy.updateMany({
            where: { findingId: findingToUpdate.id },
            data: {
              description: exp.actionableRemedy,
              remedyType: exp.remedyType as any,
              isAiGenerated: true,
            },
          });
        }
      }

      // Persist final AnalysisReport
      await this.prisma.analysisReport.create({
        data: {
          analysisId,
          summary: explanationResult.summary,
          elementalBalanceJson: explanationResult.elementalBalance as any,
          aiModelUsed: explanationResult.modelVersion || visionResult.rawModelName,
          tokenUsageJson: explanationResult.tokenUsage as any,
        },
      });

      // Persist prompt and model versions in Analysis record
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          promptVersion: explanationResult.promptVersion || null,
          modelVersion: explanationResult.modelVersion || null,
        },
      });

      await this.analysisService.transitionState(
        analysisId,
        AnalysisStatusEnum.COMPLETED,
      );

      this.logger.log(
        `Pipeline completed successfully: Analysis ${analysisId} (Score: ${evaluationResult.overallScore}/100)`,
      );

      return this.analysisService.getAnalysisById(analysisId, userId);
    } catch (err: any) {
      this.logger.error(
        `Pipeline execution failed for analysis ${analysisId}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  private async findRecentDuplicateAnalysis(
    userId: string,
    sha256Hash: string,
    roomType?: RoomTypeEnum,
    direction?: DirectionEnum,
  ) {
    const throttleWindow = new Date(Date.now() - 15 * 1000);

    const image = await this.prisma.analysisImage.findFirst({
      where: {
        sha256Hash,
        analysis: {
          userId,
          ...(roomType ? { roomType: roomType as any } : {}),
          ...(direction ? { confirmedDirection: direction as any } : {}),
          status: AnalysisStatusEnum.COMPLETED as any,
          createdAt: { gte: throttleWindow },
        },
      },
      include: {
        analysis: true,
      },
    });

    return image?.analysis;
  }
}
