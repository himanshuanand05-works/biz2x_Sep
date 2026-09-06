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

  getMissingFieldsForPayslip(payload = {}) {
    const fields = payload.fields ?? payload.extractedData ?? {};
    const rawText = payload.rawText ?? payload.text ?? '';
    const required = ['employeeName', 'employeeCode', 'payrollCycle', 'basic', 'grossPay', 'netPay'];
    const optional = ['hra', 'lta', 'specialAllowance', 'providentFund', 'professionalTax', 'incomeTaxTds'];
    const missing = [];
    const requiredMissing = [];
    const optionalMissing = [];
    const isMissing = (value) => value == null || String(value).trim() === '' || /\[\s*MISSING\s*\]|N\/A|not available/i.test(String(value));

    for (const field of required) {
      const value = fields[field];
      if (isMissing(value)) {
        missing.push(field);
        requiredMissing.push(field);
      }
    }

    for (const field of optional) {
      const value = fields[field];
      if (isMissing(value)) {
        missing.push(field);
        optionalMissing.push(field);
      }
    }

    if (rawText && /\[\s*MISSING\s*\]|N\/A|not available/i.test(rawText)) {
      const textMarkers = ['basic', 'grossPay', 'netPay', 'hra', 'lta', 'specialAllowance', 'providentFund', 'professionalTax', 'incomeTaxTds'];
      for (const token of textMarkers) {
        if (rawText.toLowerCase().includes(token.toLowerCase())) {
          const fieldValue = fields[token];
          if (isMissing(fieldValue)) {
            if (!missing.includes(token)) {
              missing.push(token);
            }
            if (required.includes(token)) {
              if (!requiredMissing.includes(token)) requiredMissing.push(token);
            } else if (!optionalMissing.includes(token)) {
              optionalMissing.push(token);
            }
          }
        }
      }
    }

    return {
      missingFields: [...new Set(missing)],
      requiredMissingFields: [...new Set(requiredMissing)],
      optionalMissingFields: [...new Set(optionalMissing)]
    };
  }

  isIncompletePayslip(payload = {}) {
    const { requiredMissingFields } = this.getMissingFieldsForPayslip(payload);
    return requiredMissingFields.length > 0;
  }

  getMockPayloadForCategory(category) { return ocrFixtures[category] ?? { text: 'No mock OCR content available.' }; }
}

export const mockOcrService = new MockOcrService();
