import { ocrFixtures } from '../../fixtures/ocr/index.js';

/** Returns deterministic OCR data while the real OCR integration is out of scope. */
export class MockOcrService {
  async extract(documentId, category, fileMeta) {
    return { documentId, category, fileName: fileMeta.originalname, ...this.getMockPayloadForCategory(category) };
  }

  getMockPayloadForCategory(category) { return ocrFixtures[category] ?? { text: 'No mock OCR content available.' }; }
}

export const mockOcrService = new MockOcrService();
