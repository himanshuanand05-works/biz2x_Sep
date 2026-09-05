import { mockOcrService } from './MockOcrService.js';
import { logger } from '../../config/logger.js';
import { ValidationError } from '../../utils/errors.js';

function financialYearFromPayrollCycle(payrollCycle) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(payrollCycle ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/** Runs request-scoped OCR without persisting uploaded file data. */
export class UserDocumentService {
  async uploadDocument(userId, file, metadata = {}) {
    const category = metadata.category ?? 'OTHER';
    const ocr = await mockOcrService.extract(null, category, file);
    const ocrFields = ocr.fields ?? ocr.extractedData ?? {};
    const payrollCycle = ocrFields.payrollCycle ?? metadata.payrollCycle ?? null;
    const financialYear = ocrFields.financialYear ?? financialYearFromPayrollCycle(payrollCycle);
    if (category === 'PAYSLIP' && !financialYear) {
      throw new ValidationError('Unable to determine financial year from payslip OCR', ['file']);
    }
    const document = {
      documentId: null,
      category,
      fileName: file.originalname,
      financialYear: financialYear ?? metadata.financialYear ?? null,
      payrollCycle,
      mockOcrPayload: ocr
    };

    logger.info('User action audited: document_upload', {
      userId,
      action: 'document_upload',
      intent: 'DOCUMENT_UPLOAD',
      query: metadata.query ?? null,
      details: {
        category: document.category,
        documentId: document.documentId,
        financialYear: document.financialYear,
        payrollCycle: document.payrollCycle
      }
    });

    return document;
  }

}

export const userDocumentService = new UserDocumentService();
