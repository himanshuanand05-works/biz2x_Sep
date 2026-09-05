import { mockOcrService } from './MockOcrService.js';
import { logger } from '../../config/logger.js';

/** Runs request-scoped OCR without persisting uploaded file data. */
export class UserDocumentService {
  async uploadDocument(userId, file, metadata = {}) {
    const category = metadata.category ?? 'OTHER';
    const ocr = await mockOcrService.extract(null, category, file);
    const document = {
      documentId: null,
      category,
      fileName: file.originalname,
      financialYear: metadata.financialYear ?? null,
      payrollCycle: metadata.payrollCycle ?? null,
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
