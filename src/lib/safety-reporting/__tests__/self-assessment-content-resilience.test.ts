import { describe, it, expect } from 'vitest';
import { buildSafetyAssessmentOutputModel } from '../assessment-view-model';
import { renderSafetyAssessmentHtml } from '../assessment-html-renderer';
import { SafetyAssessmentDocxGenerator } from '../assessment-docx-generator';
import { cleanContentValue, normalizeNfc, normalizeOptionalReportText, hasBrokenVietnameseText } from '../date-utils';

describe('Safety Self-Assessment (Mẫu 01) — Content Resilience & Real-World Validation', () => {
  const baseMockReport = {
    id: 'test-report-001',
    documentNumber: 'BC-ATLD-2026-0001',
    officialDocumentNumber: '12/BC-ATLD',
    documentPlace: 'Hà Nội',
    documentDate: new Date('2026-07-31'),
    periodStart: new Date('2026-07-27'),
    periodEnd: new Date('2026-08-02'),
    reporterName: 'Nguyễn Văn A',
    reporterTitle: 'Cán bộ ATLĐ',
    reporterDepartment: 'Phòng Kỹ thuật',
    recipientText: 'Ban Giám đốc Công ty; Phòng Kỹ thuật',
    previousWeekRemediation: '',
    reinspectionConfirmation: '',
    managementRecommendation: '',
    otherOpinion: '',
    entries: [],
  };

  describe('1. normalizeOptionalReportText Central Utility Tests', () => {
    it('normalizes legacy placeholders ("None", "none", "N/A", "-", "—", "null", "undefined") to empty string', () => {
      expect(normalizeOptionalReportText('None')).toBe('');
      expect(normalizeOptionalReportText('  none  ')).toBe('');
      expect(normalizeOptionalReportText('NONE')).toBe('');
      expect(normalizeOptionalReportText('N/A')).toBe('');
      expect(normalizeOptionalReportText('n/a')).toBe('');
      expect(normalizeOptionalReportText('-')).toBe('');
      expect(normalizeOptionalReportText('—')).toBe('');
      expect(normalizeOptionalReportText('   -   ')).toBe('');
      expect(normalizeOptionalReportText('null')).toBe('');
      expect(normalizeOptionalReportText('undefined')).toBe('');
      expect(normalizeOptionalReportText(null)).toBe('');
      expect(normalizeOptionalReportText(undefined)).toBe('');
      expect(normalizeOptionalReportText(123)).toBe('');
    });

    it('preserves legitimate text and internal line breaks while trimming leading/trailing whitespace', () => {
      expect(normalizeOptionalReportText('Có nội dung')).toBe('Có nội dung');
      expect(normalizeOptionalReportText('  Dòng 1\nDòng 2  ')).toBe('Dòng 1\nDòng 2');
      expect(normalizeOptionalReportText('Không phát sinh')).toBe('Không phát sinh');
      expect(normalizeOptionalReportText('Không phát sinh.')).toBe('Không phát sinh.');
    });

    it('cleanContentValue aliases to normalizeOptionalReportText correctly', () => {
      expect(cleanContentValue('None')).toBe('');
      expect(cleanContentValue('Hạng mục kiểm tra')).toBe('Hạng mục kiểm tra');
    });
  });

  describe('2. Legacy Placeholder & Empty State Suppression', () => {
    it('buildSafetyAssessmentOutputModel clears legacy placeholders across all report fields', () => {
      const legacyReport = {
        ...baseMockReport,
        officialDocumentNumber: 'None',
        previousWeekRemediation: 'null',
        reinspectionConfirmation: 'undefined',
        managementRecommendation: '-',
        otherOpinion: 'None',
        entries: [
          {
            id: 'entry-1',
            inspectionDate: '2026-07-27',
            shift: 'MORNING',
            inspectionContent: 'None',
            assessment: 'null',
            recommendation: 'undefined',
            implementationResult: '-',
          },
        ],
      };

      const model = buildSafetyAssessmentOutputModel(legacyReport);

      expect(model.officialDocumentNumber).toBe('');
      expect(model.previousWeekRemediation).toBe('');
      expect(model.reinspectionConfirmation).toBe('');
      expect(model.managementRecommendation).toBe('');
      expect(model.otherOpinion).toBe('');

      const entry = model.flatEntries[0];
      expect(entry.inspectionContent).toBe('');
      expect(entry.assessment).toBe('');
      expect(entry.recommendation).toBe('');
      expect(entry.implementationResult).toBe('');
    });

    it('renderSafetyAssessmentHtml does NOT output "(Không có)", "None", or "null" when fields are empty', () => {
      const model = buildSafetyAssessmentOutputModel(baseMockReport);
      const html = renderSafetyAssessmentHtml(model);

      expect(html).not.toContain('(Không có)');
      expect(html).not.toContain('None');
      expect(html).not.toContain('null');
      expect(html).not.toContain('undefined');
      expect(html).toContain('I. ĐÁNH GIÁ KẾT QUẢ, XỬ LÝ TỒN TẠI CỦA TUẦN TRƯỚC');
      expect(html).toContain('II. KIẾN NGHỊ ĐỀ XUẤT BAN GIÁM ĐỐC VỀ KẾT QUẢ TUẦN');
    });
  });

  describe('3. Multi-Line & Free-Text Verbatim Rendering', () => {
    it('Empty State (CHƯA NHẬP): Renders section headers but leaves content space clean', () => {
      const model = buildSafetyAssessmentOutputModel(baseMockReport);
      const html = renderSafetyAssessmentHtml(model);

      expect(html).toContain('1. Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng');
      expect(html).toContain('class="assessment-handwriting-lines"');
    });

    it('Manual Free-Text: Renders verbatim content with line breaks preserved', () => {
      const report = {
        ...baseMockReport,
        previousWeekRemediation: 'Dòng 1: Đã khắc phục 5 nón bảo hộ.\nDòng 2: Đã bổ sung lưới an toàn tầng 4.',
      };

      const model = buildSafetyAssessmentOutputModel(report);
      const html = renderSafetyAssessmentHtml(model);

      expect(html).toContain('Dòng 1: Đã khắc phục 5 nón bảo hộ.<br/>Dòng 2: Đã bổ sung lưới an toàn tầng 4.');
    });
  });

  describe('4. Ultra Long Content Resilience (10,000+ characters)', () => {
    it('handles 10,000+ character long text fields without truncation', async () => {
      const longText = 'Nội dung kiểm tra an toàn lao động chi tiết: ' + 'A'.repeat(10000) + '\nCuối đoạn văn bản.';
      const report = {
        ...baseMockReport,
        previousWeekRemediation: longText,
        entries: [
          {
            id: 'entry-long-1',
            inspectionDate: '2026-07-27',
            shift: 'MORNING',
            inspectionContent: longText,
            assessment: 'Đánh giá bình thường',
            recommendation: 'Duy trì kiểm tra',
            implementationResult: 'Đã hoàn thành',
          },
        ],
      };

      const model = buildSafetyAssessmentOutputModel(report);
      expect(model.previousWeekRemediation.length).toBeGreaterThan(10000);
      expect(model.flatEntries[0].inspectionContent.length).toBeGreaterThan(10000);

      // Verify HTML render
      const html = renderSafetyAssessmentHtml(model);
      expect(html).toContain('Cuối đoạn văn bản.');

      // Verify DOCX generation without error
      const docxBuffer = await SafetyAssessmentDocxGenerator.generateAssessmentDocx(report);
      expect(docxBuffer).toBeInstanceOf(Buffer);
      expect(docxBuffer.length).toBeGreaterThan(5000);
    });
  });

  describe('5. Unicode & Control Character Sanitization', () => {
    it('strips ASCII control characters while preserving tabs, newlines, and Vietnamese diacritics', () => {
      const dirtyInput = 'Tiêu đề \x00an toàn \x07lao động\r\n- Hạng mục 1\tĐạt\n- Hạng mục 2\tChưa đạt';
      const clean = normalizeNfc(dirtyInput);

      expect(clean).toBe('Tiêu đề an toàn lao động\n- Hạng mục 1\tĐạt\n- Hạng mục 2\tChưa đạt');
      expect(hasBrokenVietnameseText(clean)).toBe(false);
    });

    it('preserves correct Vietnamese combining diacritics without split words', () => {
      const vnText = 'Công trình kiểm tra an toàn lao động Buổi Sáng, Chiều, Tối';
      expect(hasBrokenVietnameseText(vnText)).toBe(false);
    });
  });

  describe('6. 5-Column Matrix Structure & Multiple Sites', () => {
    it('correctly maps 7 days x 3 shifts = 21 shift matrix rows', () => {
      const model = buildSafetyAssessmentOutputModel(baseMockReport);
      expect(model.days).toHaveLength(7);
      expect(model.tableRows.length).toBe(21); // 7 days * 3 shifts (MORNING, AFTERNOON, EVENING)
    });

    it('supports multiple project entries in a single shift sorted by sortOrder', () => {
      const multiProjectReport = {
        ...baseMockReport,
        entries: [
          {
            id: 'e1',
            inspectionDate: '2026-07-27',
            shift: 'MORNING',
            projectNameSnapshot: 'Công trình A',
            inspectionContent: 'Kiểm tra giàn giáo',
            sortOrder: 2,
          },
          {
            id: 'e2',
            inspectionDate: '2026-07-27',
            shift: 'MORNING',
            projectNameSnapshot: 'Công trình B',
            inspectionContent: 'Kiểm tra PCCC',
            sortOrder: 1,
          },
        ],
      };

      const model = buildSafetyAssessmentOutputModel(multiProjectReport);
      const morningShiftEntries = model.days[0].shifts[0].entries;

      expect(morningShiftEntries).toHaveLength(2);
      expect(morningShiftEntries[0].projectName).toBe('Công trình B');
      expect(morningShiftEntries[1].projectName).toBe('Công trình A');
    });
  });
});
