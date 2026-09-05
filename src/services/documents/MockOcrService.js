import { ocrFixtures } from '../../fixtures/ocr/index.js';

/** Returns deterministic OCR data while the real OCR integration is out of scope. */
export class MockOcrService {
  async extract(documentId, category, fileMeta) {
    const payload = this.getMockPayloadForCategory(category);
    return {
      documentId,
      category,
      fileName: fileMeta.originalname,
      ...payload,
      extractedData: payload.fields ?? {}
    };
  }

  getMockPayloadForCategory(category) { return ocrFixtures[category] ?? { text: 'No mock OCR content available.' }; }
}

export const mockOcrService = new MockOcrService();
