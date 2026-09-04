import { userDocumentRepository } from '../../repositories/UserDocumentRepository.js';
import { DocumentStatus } from '../../domain/enums.js';
import { createId } from '../../utils/ids.js';
import { NotFoundError } from '../../utils/errors.js';
import { mockOcrService } from './MockOcrService.js';

/** Owns document metadata and delegates OCR to the prototype adapter. */
export class UserDocumentService {
  async uploadDocument(userId, file, metadata = {}) {
    const document = await userDocumentRepository.create({
      documentId: createId('doc'), userId, category: metadata.category ?? 'OTHER',
      fileName: file.originalname, mimeType: file.mimetype, fileSizeBytes: file.size,
      status: DocumentStatus.OCR_PENDING, financialYear: metadata.financialYear ?? null,
      payrollCycle: metadata.payrollCycle ?? null, createdBy: userId, updatedBy: userId
    });
    const ocr = await mockOcrService.extract(document.documentId, document.category, file);
    return userDocumentRepository.update(userId, document.documentId, { status: DocumentStatus.OCR_COMPLETE, mockOcrPayload: ocr, updatedBy: userId });
  }

  async list(userId, filters = {}) { return userDocumentRepository.find(userId, filters); }

  async getById(userId, documentId) {
    const document = await userDocumentRepository.findByUserAndId(userId, documentId);
    if (!document) throw new NotFoundError('Document not found');
    return document;
  }

  async softDelete(userId, documentId) {
    await this.getById(userId, documentId);
    return userDocumentRepository.delete(userId, documentId);
  }
}

export const userDocumentService = new UserDocumentService();
