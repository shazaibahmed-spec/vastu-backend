import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AnalysisNotFoundException } from '../../common/exceptions/domain.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AnalysisService } from '../analysis/services/analysis.service.js';
import { AnalysisResponseDto } from '../analysis/dto/analysis-response.dto.js';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: AnalysisService,
  ) {}

  /**
   * Generates a high-resolution, branded PDF certificate for an analysis.
   */
  async generateAnalysisPdf(analysisId: string): Promise<Buffer> {
    const analysis = await this.analysisService.getAnalysisById(analysisId);
    if (!analysis) {
      throw new AnalysisNotFoundException(analysisId);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `Vastu Harmony Certificate - ${analysis.roomType}`,
            Author: 'Vastu AI Intelligence Engine',
            Subject: 'Vastu Shastra Classical Spatial Audit',
            Keywords: 'Vastu, Architecture, Harmony, Pancha Bhoota, Energy',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        this.renderPdfContent(doc, analysis);
        doc.end();
      } catch (err) {
        this.logger.error(`Error generating PDF for ${analysisId}: ${err}`);
        reject(err);
      }
    });
  }

  private renderPdfContent(doc: typeof PDFDocument.prototype, data: AnalysisResponseDto): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // --- Elegant Outer Border ---
    doc
      .rect(margin - 10, margin - 10, contentWidth + 20, pageHeight - margin * 2 + 20)
      .lineWidth(1)
      .strokeColor('#D4AF37')
      .stroke();

    doc
      .rect(margin - 6, margin - 6, contentWidth + 12, pageHeight - margin * 2 + 12)
      .lineWidth(0.5)
      .strokeColor('#E2E8F0')
      .stroke();

    // --- Header Section ---
    doc.fillColor('#0B111E').rect(margin, margin, contentWidth, 54).fill();

    // Gold Top Accent Line
    doc.fillColor('#D4AF37').rect(margin, margin, contentWidth, 3).fill();

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#D4AF37')
      .text('VASTU AI  •  AUTHENTIC SPATIAL AUDIT', margin + 16, margin + 14);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#94A3B8')
      .text('DETERMINISTIC VEDIC RULES ENGINE  •  CERTIFIED HARMONY REPORT', margin + 16, margin + 34);

    const certDate = new Date(data.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#94A3B8')
      .text(`CERTIFICATE ID: #${data.id.slice(0, 8).toUpperCase()}`, margin, margin + 16, {
        align: 'right',
        width: contentWidth - 16,
      });

    doc
      .text(`ISSUED: ${certDate}`, margin, margin + 32, {
        align: 'right',
        width: contentWidth - 16,
      });

    let currentY = margin + 68;

    // --- Summary & Diagnostics Banner ---
    const cardBg = '#F8FAFC';
    const cardBorder = '#E2E8F0';

    doc.roundedRect(margin, currentY, contentWidth, 80, 4).fillAndStroke(cardBg, cardBorder);

    // Score Column
    const score = data.overallScore ?? 0;
    const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

    doc
      .font('Helvetica-Bold')
      .fontSize(32)
      .fillColor(scoreColor)
      .text(`${score}`, margin + 20, currentY + 14);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#64748B')
      .text('/ 100', margin + 62, currentY + 28);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(scoreColor)
      .text(data.scoreBand?.replace('_', ' ') || 'EVALUATED', margin + 20, currentY + 52);

    // Vertical Divider
    doc
      .moveTo(margin + 120, currentY + 10)
      .lineTo(margin + 120, currentY + 70)
      .lineWidth(1)
      .strokeColor('#CBD5E1')
      .stroke();

    // Diagnostics Details
    const compliantCount = data.findings.filter((f) => f.verdict === 'COMPLIANT').length;
    const defectCount = data.findings.filter((f) => f.verdict === 'DEFECT').length;
    const roomName = data.roomType.replace('_', ' ');

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1E293B')
      .text('ROOM TYPE:', margin + 140, currentY + 14);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#334155')
      .text(roomName, margin + 220, currentY + 14);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1E293B')
      .text('ORIENTATION:', margin + 140, currentY + 32);

    const orientationHeading = data.orientation?.heading;
    const orientationDir = data.orientation?.direction;
    const dirText =
      orientationHeading !== undefined && orientationHeading !== null
        ? `${orientationDir || 'CALIBRATED'} (${Math.round(orientationHeading)}° True)`
        : `${orientationDir || 'CALIBRATED'}`;

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#334155')
      .text(dirText, margin + 220, currentY + 32);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1E293B')
      .text('EVALUATION:', margin + 140, currentY + 50);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#10B981')
      .text(`${compliantCount} Compliant`, margin + 220, currentY + 50);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#EF4444')
      .text(`  •  ${defectCount} Defects Identified`, margin + 285, currentY + 50);

    currentY += 92;

    // --- Five Elements (Pancha Bhoota) Balance Audit ---
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#1E293B')
      .text('PANCHA BHOOTA (FIVE ELEMENTS) BALANCE AUDIT', margin, currentY);

    currentY += 16;

    const elements = [
      { name: 'Earth (Prithvi)', status: data.elementalBalance?.earth || 'Balanced' },
      { name: 'Water (Jal)', status: data.elementalBalance?.water || 'Balanced' },
      { name: 'Fire (Agni)', status: data.elementalBalance?.fire || 'Balanced' },
      { name: 'Air (Vayu)', status: data.elementalBalance?.air || 'Balanced' },
      { name: 'Space (Akasha)', status: data.elementalBalance?.space || 'Balanced' },
    ];

    const elemColWidth = contentWidth / elements.length;
    elements.forEach((elem, index) => {
      const x = margin + index * elemColWidth;
      const isDefect =
        elem.status.toLowerCase().includes('defect') ||
        elem.status.toLowerCase().includes('aggravated') ||
        elem.status.toLowerCase().includes('deficit');

      const pillColor = isDefect ? '#FEE2E2' : '#DCFCE7';
      const textColor = isDefect ? '#B91C1C' : '#15803D';

      doc.roundedRect(x + 2, currentY, elemColWidth - 4, 38, 3).fillAndStroke(cardBg, cardBorder);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#475569')
        .text(elem.name, x + 4, currentY + 6, { width: elemColWidth - 8, align: 'center' });

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textColor)
        .text(elem.status.split('.')[0] || elem.status, x + 4, currentY + 22, {
          width: elemColWidth - 8,
          align: 'center',
        });
    });

    currentY += 48;

    // --- Classical Vastu Rule Findings ---
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#1E293B')
      .text('EVALUATED VASTU FINDINGS & SPATIAL VERDICTS', margin, currentY);

    currentY += 16;

    // Table Header
    doc.rect(margin, currentY, contentWidth, 20).fill('#0B111E');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#D4AF37');
    doc.text('RULE & CODE', margin + 8, currentY + 6);
    doc.text('ZONE', margin + 180, currentY + 6);
    doc.text('SEVERITY', margin + 260, currentY + 6);
    doc.text('VERDICT', margin + 340, currentY + 6);
    doc.text('IMPACT / RATIONALE', margin + 410, currentY + 6);

    currentY += 20;

    // Findings Rows (capped to fit neatly on page 1, or flow to page 2)
    const displayedFindings = data.findings.slice(0, 5);
    displayedFindings.forEach((finding, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(margin, currentY, contentWidth, 26).fillAndStroke(rowBg, '#F1F5F9');

      const isCompliant = finding.verdict === 'COMPLIANT';
      const verdictColor = isCompliant ? '#10B981' : '#EF4444';

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1E293B')
        .text(finding.title || finding.ruleCode, margin + 8, currentY + 5, {
          width: 165,
          ellipsis: true,
        });

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#64748B')
        .text(finding.ruleCode, margin + 8, currentY + 15);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#334155')
        .text(finding.category?.replace('_', ' ') || 'SPATIAL', margin + 180, currentY + 9);

      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(
          finding.severity === 'CRITICAL'
            ? '#B91C1C'
            : finding.severity === 'HIGH'
            ? '#D97706'
            : '#2563EB',
        )
        .text(finding.severity || 'LOW', margin + 260, currentY + 9);

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(verdictColor)
        .text(finding.verdict, margin + 340, currentY + 9);

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(finding.description || 'Verified via Classical AST Evaluator', margin + 410, currentY + 5, {
          width: contentWidth - 418,
          height: 20,
          ellipsis: true,
        });

      currentY += 26;
    });

    currentY += 12;

    // --- Actionable Remediation Plan ---
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#1E293B')
      .text('ACTIONABLE REMEDIATION ROADMAP', margin, currentY);

    currentY += 16;

    const allRemedies: Array<{ action: string; type?: string; rule: string }> = [];
    data.findings.forEach((f) => {
      f.remedies.forEach((r) => {
        allRemedies.push({ action: r.action, type: r.type, rule: f.title || f.ruleCode });
      });
    });

    const displayedRemedies = allRemedies.length > 0 ? allRemedies.slice(0, 3) : [
      {
        action: 'Maintain current spatial configuration. Space adheres to core cardinal balance principles.',
        type: 'ELEMENTAL',
        rule: 'Overall Space Harmony',
      },
    ];

    displayedRemedies.forEach((rem, idx) => {
      doc.roundedRect(margin, currentY, contentWidth, 34, 3).fillAndStroke(cardBg, cardBorder);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#D4AF37')
        .text(`STEP ${idx + 1} [${rem.type || 'RECOMMENDED'}]`, margin + 10, currentY + 6);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#1E293B')
        .text(rem.action, margin + 10, currentY + 18, { width: contentWidth - 20, ellipsis: true });

      currentY += 38;
    });

    // --- Footer Seal & Disclaimer ---
    const footerY = pageHeight - margin - 22;

    doc
      .moveTo(margin, footerY)
      .lineTo(margin + contentWidth, footerY)
      .lineWidth(0.5)
      .strokeColor('#CBD5E1')
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#D4AF37')
      .text('VASTU AI AUDIT SEAL', margin, footerY + 4);

    doc
      .font('Helvetica')
      .fontSize(6)
      .fillColor('#64748B')
      .text(
        'This assessment is derived mathematically from classical Vastu Shastra rules (Samarangana Sutradhara, Mayamata, Vishwakarma Prakash). Certified authentic by Vastu AI.',
        margin,
        footerY + 13,
        { width: contentWidth - 140, lineBreak: false },
      );

    doc
      .font('Helvetica')
      .fontSize(6.5)
      .fillColor('#94A3B8')
      .text(`PAGE 1 OF 1  •  COPYRIGHT © ${new Date().getFullYear()} VASTU AI`, margin, footerY + 8, {
        align: 'right',
        width: contentWidth,
      });
  }
}
