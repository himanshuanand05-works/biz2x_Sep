import { mockOcrService } from './MockOcrService.js';

/** Runs request-scoped OCR without persisting uploaded file data. */
export class UserDocumentService {
  async uploadDocument(userId, file, metadata = {}) {
    const category = metadata.category ?? 'OTHER';
    const ocr = await mockOcrService.extract(null, category, file);
    return {
      documentId: null,
      category,
      fileName: file.originalname,
      financialYear: metadata.financialYear ?? null,
      payrollCycle: metadata.payrollCycle ?? null,
      mockOcrPayload: ocr
    };
  }

}

export const userDocumentService = new UserDocumentService();
