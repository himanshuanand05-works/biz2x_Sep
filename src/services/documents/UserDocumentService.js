import { mockOcrService } from './MockOcrService.js';
import { userDocumentRepository } from '../../repositories/UserDocumentRepository.js';
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
  async findByUser(userId, filters = {}) {
    return userDocumentRepository.find(userId, filters);
  }

  async findByUserAndId(userId, documentId) {
    return userDocumentRepository.findByUserAndId(userId, documentId);
  }

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
      mockOcrPayload: ocr,
      isPartial: false,
      missingFields: [],
      requiredMissingFields: [],
      optionalMissingFields: []
    };

    if (category === 'PAYSLIP') {
      const fieldStatus = mockOcrService.getMissingFieldsForPayslip(ocr);
      document.missingFields = fieldStatus.missingFields;
      document.requiredMissingFields = fieldStatus.requiredMissingFields;
      document.optionalMissingFields = fieldStatus.optionalMissingFields;
      document.isPartial = fieldStatus.missingFields.length > 0;
      if (document.requiredMissingFields.length > 0) {
        logger.warn('User action audited: document_upload_incomplete', {
          userId,
          action: 'document_upload_incomplete',
          intent: 'REFUSAL',
          query: metadata.query ?? null,
          details: {
            category: document.category,
            financialYear: document.financialYear,
            payrollCycle: document.payrollCycle,
            missingFields: document.requiredMissingFields
          }
        });
      }
    }

    logger.info('User action audited: document_upload', {
      userId,
      action: 'document_upload',
      intent: document.requiredMissingFields.length > 0 ? 'REFUSAL' : 'DOCUMENT_UPLOAD',
      query: metadata.query ?? null,
      details: {
        category: document.category,
        documentId: document.documentId,
        financialYear: document.financialYear,
        payrollCycle: document.payrollCycle,
        missingFields: document.missingFields,
        requiredMissingFields: document.requiredMissingFields,
        optionalMissingFields: document.optionalMissingFields
      }
    });

    return document;
  }

}

export const userDocumentService = new UserDocumentService();
