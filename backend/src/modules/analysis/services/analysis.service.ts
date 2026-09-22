import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  AnalysisStatusEnum,
  DEFAULT_DEV_USER_ID,
  DirectionEnum,
  DirectionSourceEnum,
  RoomTypeEnum,
  ScoreBandEnum,
  SupportedLanguageEnum,
} from '../../../common/constants/index.js';
import {
  AnalysisNotFoundException,
  InvalidDirectionException,
} from '../../../common/exceptions/domain.exception.js';
import { CompassUtil } from '../../../common/utils/compass.util.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { LLM_PROVIDER_TOKEN } from '../../ai/ai.module.js';
import type { LLMProvider } from '../../ai/interfaces/llm-provider.interface.js';
import { VastuScoreCalculator } from '../../vastu/engine/score-calculator.js';
import { VastuRulesEngine } from '../../vastu/engine/vastu-rules-engine.js';
import {
  AnalysisResponseDto,
  AnalysisSummaryCardDto,
} from '../dto/analysis-response.dto.js';
import { CreateAnalysisDto } from '../dto/create-analysis.dto.js';
import { QueryAnalysisDto } from '../dto/query-analysis.dto.js';
import { AnalysisStateMachine } from '../state-machine/analysis-state-machine.js';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vastuRulesEngine: VastuRulesEngine,
    @Optional()
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider?: LLMProvider,
  ) {}

  /**
   * Validates direction input and determines calibrated direction.
   */
  resolveDirection(dto: CreateAnalysisDto): {
    heading?: number;
    direction?: DirectionEnum;
    isCalibrated: boolean;
  } {
    if (dto.directionSource === DirectionSourceEnum.DEVICE_COMPASS) {
      if (dto.compassHeading === undefined || dto.compassHeading === null) {
        throw new InvalidDirectionException(
          'compassHeading is required when directionSource is DEVICE_COMPASS.',
        );
      }
      const heading = CompassUtil.normalizeAngle(dto.compassHeading);
      const direction = CompassUtil.headingToDirection(heading);
      return { heading, direction, isCalibrated: true };
    }

    if (dto.directionSource === DirectionSourceEnum.USER_SELECTED) {
      if (!dto.userSelectedDirection) {
        throw new InvalidDirectionException(
          'userSelectedDirection is required when directionSource is USER_SELECTED.',
        );
      }
      const heading =
        dto.compassHeading !== undefined && dto.compassHeading !== null
          ? CompassUtil.normalizeAngle(dto.compassHeading)
          : CompassUtil.directionToDegrees(dto.userSelectedDirection);
      return {
        heading,
        direction: dto.userSelectedDirection,
        isCalibrated: true,
      };
    }

    // UNKNOWN source: degraded uncalibrated mode
    return { isCalibrated: false };
  }

  /**
   * Ensures an active VastuRuleVersion exists in database.
   */
  async getOrCreateCurrentRuleVersion(): Promise<string> {
    const currentVersion = await this.prisma.vastuRuleVersion.findFirst({
      where: { isCurrent: true },
    });

    if (currentVersion) {
      return currentVersion.id;
    }

    // Auto-create initial v1.0.0 if not seeded yet
    const created = await this.prisma.vastuRuleVersion.create({
      data: {
        versionNumber: '1.0.0',
        releaseNotes: 'Initial classical Vastu Shastra ruleset v1.0.0',
        isCurrent: true,
      },
    });

    return created.id;
  }

  /**
   * Initializes an analysis entity in PENDING state.
   */
  async createAnalysisIntent(
    userId: string,
    dto: CreateAnalysisDto,
    targetLanguage?: string,
  ): Promise<string> {
    const { heading, direction } = this.resolveDirection(dto);
    const ruleVersionId = await this.getOrCreateCurrentRuleVersion();

    if (userId === DEFAULT_DEV_USER_ID) {
      await this.prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: 'dev@vastu.local',
          passwordHash: '$2b$12$dummydevuserpasswordhashwhichislongenough1234567890',
          name: 'Local Dev User',
        },
      });
    }

    const resolvedLanguage = targetLanguage || dto.language || 'en';

    const analysis = await this.prisma.$transaction(async (tx) => {
      const createdAnalysis = await tx.analysis.create({
        data: {
          userId,
          ruleVersionId,
          roomType: dto.roomType as any,
          status: AnalysisStatusEnum.PENDING as any,
          compassHeading: heading,
          directionSource: dto.directionSource as any,
          confirmedDirection: direction as any,
          languageCode: resolvedLanguage,
        },
      });

      await tx.analysisInput.create({
        data: {
          analysisId: createdAnalysis.id,
          rawCompassHeading: dto.compassHeading,
          userSelectedDirection: dto.userSelectedDirection as any,
          roomType: dto.roomType as any,
          metadataJson: {
            notes: dto.notes,
            submittedAt: new Date().toISOString(),
          },
        },
      });

      return createdAnalysis;
    });

    this.logger.log(
      `Analysis intent initialized: ${analysis.id} (Room: ${dto.roomType}, User: ${userId})`,
    );

    return analysis.id;
  }

  /**
   * Transitions an analysis to a new status, verifying state machine transition rules.
   */
  async transitionState(
    analysisId: string,
    targetStatus: AnalysisStatusEnum,
  ): Promise<void> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { status: true },
    });

    if (!analysis) {
      throw new AnalysisNotFoundException(analysisId);
    }

    AnalysisStateMachine.assertValidTransition(
      analysis.status as AnalysisStatusEnum,
      targetStatus,
    );

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: { status: targetStatus as any },
    });

    this.logger.log(
      `Analysis ${analysisId} transitioned from ${analysis.status} -> ${targetStatus}`,
    );
  }

  /**
   * Retrieves a detailed analysis report by ID.
   */
  async getAnalysisById(
    analysisId: string,
    userId?: string,
    requestedLanguage?: SupportedLanguageEnum,
  ): Promise<AnalysisResponseDto> {
    const hasSpecificUser = userId && userId !== DEFAULT_DEV_USER_ID;

    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        ...(hasSpecificUser
          ? {
              OR: [
                { userId },
                { userId: DEFAULT_DEV_USER_ID },
              ],
            }
          : {}),
        deletedAt: null,
      },
      include: {
        image: true,
        detectedObjects: true,
        findings: {
          include: {
            rule: true,
            detectedObject: true,
            remedies: true,
          },
        },
        report: true,
      },
    });

    if (!analysis) {
      throw new AnalysisNotFoundException(analysisId);
    }

    // Auto-claim: If an authenticated user accesses an anonymous/guest analysis, associate it with their account
    if (hasSpecificUser && analysis.userId === DEFAULT_DEV_USER_ID) {
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { userId },
      });
      this.logger.log(`Guest analysis ${analysisId} claimed and associated with user ${userId}`);
      analysis.userId = userId;
    }

    // Dynamic translation: If requested language differs from stored report language
    if (
      requestedLanguage &&
      this.llmProvider &&
      analysis.status === AnalysisStatusEnum.COMPLETED &&
      requestedLanguage !== analysis.languageCode
    ) {
      try {
        const score = analysis.overallScore ?? 0;
        const scoreBand =
          analysis.overallScore !== null && analysis.overallScore !== undefined
            ? VastuScoreCalculator.determineScoreBand(analysis.overallScore)
            : ScoreBandEnum.FAIR;

        const explanationResult = await this.llmProvider.generateExplanation({
          roomType: analysis.roomType as RoomTypeEnum,
          overallScore: score,
          scoreBand,
          language: requestedLanguage,
          findings: analysis.findings.map((f: any) => ({
            ruleCode: f.rule?.code || f.ruleId,
            category: 'ANALYSIS',
            verdict: f.verdict as any,
            severity: f.severity as any,
            targetObject: f.detectedObject?.objectType || 'object',
            zone:
              f.detectedObject?.zone ||
              (analysis.confirmedDirection as any) ||
              DirectionEnum.NORTH,
            canonicalDescription: f.rule?.standardDescription || f.rawReason,
            defaultRemedyText:
              f.rule?.defaultRemedy || f.remedies?.[0]?.description,
          })),
        });

        const dto = this.mapToResponseDto(analysis);
        dto.language = requestedLanguage;
        dto.aiSummary = explanationResult.summary;
        dto.findings = dto.findings.map((finding, idx) => {
          const matched =
            explanationResult.findingExplanations.find(
              (e) =>
                e.ruleCode === finding.ruleCode ||
                e.ruleCode === analysis.findings[idx]?.rule?.code ||
                e.ruleCode === analysis.findings[idx]?.ruleId,
            ) || explanationResult.findingExplanations[idx];
          if (!matched) return finding;
          return {
            ...finding,
            title:
              matched.laymanExplanation.split('.')[0] ||
              matched.laymanExplanation,
            description: matched.laymanExplanation,
            remedies: [
              {
                type: matched.remedyType as any,
                action: matched.actionableRemedy,
              },
            ],
          };
        });
        return dto;
      } catch (err) {
        this.logger.warn(
          `Failed to dynamically translate report ${analysisId} to ${requestedLanguage}: ${err}`,
        );
      }
    }

    return this.mapToResponseDto(analysis);
  }

  /**
   * Queries paginated analysis history for a user.
   */
  async listUserAnalyses(
    userId: string,
    query: QueryAnalysisDto,
  ): Promise<{
    data: AnalysisSummaryCardDto[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const whereClause: any = {
      userId,
      deletedAt: null,
      ...(query.roomType ? { roomType: query.roomType } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [totalItems, analyses] = await Promise.all([
      this.prisma.analysis.count({ where: whereClause }),
      this.prisma.analysis.findMany({
        where: whereClause,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { image: true },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / query.limit) || 1;

    const data: AnalysisSummaryCardDto[] = analyses.map((item) => ({
      id: item.id,
      roomType: item.roomType as any,
      status: item.status as any,
      overallScore: item.overallScore ?? undefined,
      thumbnailUrl: item.image?.storageKey ? `/storage/${item.image.storageKey}` : undefined,
      direction: item.confirmedDirection as any,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1,
      },
    };
  }

  /**
   * Soft deletes an analysis.
   */
  async softDeleteAnalysis(analysisId: string, userId: string): Promise<void> {
    const hasSpecificUser = userId && userId !== DEFAULT_DEV_USER_ID;

    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        ...(hasSpecificUser
          ? {
              OR: [
                { userId },
                { userId: DEFAULT_DEV_USER_ID },
              ],
            }
          : { userId }),
        deletedAt: null,
      },
    });

    if (!analysis) {
      throw new AnalysisNotFoundException(analysisId);
    }

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Analysis ${analysisId} soft-deleted by user ${userId}`);
  }

  /**
   * Retries an analysis from a failed state.
   */
  async retryAnalysis(analysisId: string, userId: string): Promise<void> {
    const hasSpecificUser = userId && userId !== DEFAULT_DEV_USER_ID;

    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        ...(hasSpecificUser
          ? {
              OR: [
                { userId },
                { userId: DEFAULT_DEV_USER_ID },
              ],
            }
          : { userId }),
        deletedAt: null,
      },
    });

    if (!analysis) {
      throw new AnalysisNotFoundException(analysisId);
    }

    const currentStatus = analysis.status as AnalysisStatusEnum;

    if (!AnalysisStateMachine.isRetryable(currentStatus)) {
      throw new Error(`Analysis in status '${currentStatus}' cannot be retried.`);
    }

    // Determine target retry state
    let targetState = AnalysisStatusEnum.AI_ANALYSIS;
    if (currentStatus === AnalysisStatusEnum.FAILED_REPORT_GENERATION) {
      targetState = AnalysisStatusEnum.REPORT_GENERATION;
    } else if (currentStatus === AnalysisStatusEnum.FAILED_RULE_EVALUATION) {
      targetState = AnalysisStatusEnum.RULE_EVALUATION;
    }

    await this.transitionState(analysisId, targetState);
  }

  private mapToResponseDto(analysis: any): AnalysisResponseDto {
    const isCalibrated = analysis.directionSource !== DirectionSourceEnum.UNKNOWN;

    return {
      id: analysis.id,
      status: analysis.status,
      roomType: analysis.roomType,
      orientation: {
        source: analysis.directionSource,
        heading: analysis.compassHeading ?? undefined,
        direction: analysis.confirmedDirection ?? undefined,
        isCalibrated,
      },
      overallScore: analysis.overallScore ?? undefined,
      scoreBand:
        analysis.overallScore !== null && analysis.overallScore !== undefined
          ? VastuScoreCalculator.determineScoreBand(analysis.overallScore)
          : undefined,
      image: analysis.image
        ? {
            url: analysis.image.storageKey.startsWith('http') || analysis.image.storageKey.startsWith('/')
              ? analysis.image.storageKey
              : `/storage/${analysis.image.storageKey}`,
            width: analysis.image.width ?? undefined,
            height: analysis.image.height ?? undefined,
          }
        : undefined,
      elementalBalance: (analysis.report?.elementalBalanceJson as any) ?? undefined,
      detectedObjects: (analysis.detectedObjects || []).map((obj: any) => {
        let boundingBox = obj.boundingBox
          ? {
              x: Number(obj.boundingBox.x ?? 0),
              y: Number(obj.boundingBox.y ?? 0),
              width: Number(obj.boundingBox.width ?? 0),
              height: Number(obj.boundingBox.height ?? 0),
            }
          : undefined;

        if (!boundingBox && obj.relativePosition) {
          const posX = Number(obj.relativePosition.x ?? 0.5);
          const posY = Number(obj.relativePosition.y ?? 0.5);
          const boxW = 0.26;
          const boxH = 0.22;
          boundingBox = {
            x: Math.max(0, Math.min(1 - boxW, posX - boxW / 2)),
            y: Math.max(0, Math.min(1 - boxH, posY - boxH / 2)),
            width: boxW,
            height: boxH,
          };
        }

        return {
          id: obj.id,
          type: obj.objectType,
          objectType: obj.objectType,
          label: obj.label,
          zone: obj.zone,
          relativePosition: obj.relativePosition,
          confidence: obj.confidence,
          boundingBox,
          detectionStatus: obj.detectionStatus ?? 'DETECTED',
          attributes: (obj.attributesJson ?? obj.attributes) ?? undefined,
        };
      }),
      findings: (analysis.findings || []).map((finding: any) => ({
        id: finding.id,
        ruleCode: finding.ruleId, // mapped to ruleId or code
        category: 'ANALYSIS',
        verdict: finding.verdict,
        severity: finding.severity,
        title: finding.rawReason?.split('.')[0] || 'Vastu Finding',
        description: finding.rawReason,
        remedies: (finding.remedies || []).map((r: any) => ({
          type: r.remedyType,
          action: r.description,
        })),
      })),
      aiSummary: analysis.report?.summary ?? undefined,
      imageQualityScore: analysis.imageQualityScore ?? undefined,
      visionModelUsed: analysis.visionModelUsed ?? undefined,
      visionDurationMs: analysis.visionDurationMs ?? undefined,
      language: analysis.languageCode || 'en',
      createdAt: analysis.createdAt.toISOString(),
      completedAt: analysis.updatedAt ? analysis.updatedAt.toISOString() : undefined,
    };
  }
}
