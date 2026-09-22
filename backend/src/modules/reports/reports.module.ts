import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AnalysisModule } from '../analysis/analysis.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [DatabaseModule, AnalysisModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
