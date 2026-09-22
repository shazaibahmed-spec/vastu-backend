import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { VastuModule } from '../vastu/vastu.module.js';
import { AnalysisController } from './controllers/analysis.controller.js';
import { AnalysisPipelineService } from './services/analysis-pipeline.service.js';
import { AnalysisService } from './services/analysis.service.js';

@Module({
  imports: [VastuModule, StorageModule, AiModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, AnalysisPipelineService],
  exports: [AnalysisService, AnalysisPipelineService],
})
export class AnalysisModule {}
