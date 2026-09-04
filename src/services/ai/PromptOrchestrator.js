import { QueryIntent } from '../../domain/enums.js';
import { contextAssembler } from './ContextAssembler.js';
import { taxCalculatorService } from '../tax/TaxCalculatorService.js';
import { llmClient } from './LlmClient.js';

const refusalRules = [
  { pattern: /manager.{0,40}salary|salary.{0,40}manager/i, reason: 'I cannot provide another person\'s private salary information.' },
  { pattern: /tax law.{0,40}(france|foreign)|france.{0,40}tax/i, reason: 'I can only help with the tax information supported by your current employee records.' }
];

/** Orchestrates scoped context, deterministic calculations, refusal checks, and the LLM call. */
export class PromptOrchestrator {
  async answer(userId, userQuery, options = {}) {
    const refusal = this.getRefusal(userQuery);
    if (refusal) return { answer: refusal.reason, intent: 'REFUSAL', sources: [], assumptions: [], refusal: true };

    const context = await contextAssembler.assemble(userId, options);
    let taxData = null;
    if (this.classifyIntent(userQuery) === QueryIntent.TAX_SIMULATION && options.proposed80C != null) {
      taxData = await taxCalculatorService.calculate80CSavings(
        context.userProfile,
        options.proposed80C,
        options.financialYear ?? context.payroll?.financialYear
      );
    }
    const prompt = this.buildGroundedPrompt(userQuery, context, taxData);
    const result = await llmClient.query({
      prompt,
      pdfBase64: options.pdfBase64,
      imageBase64: options.imageBase64,
      imageMediaType: options.imageMediaType,
      metadata: { userId, ...options }
    });
    return {
      answer: result.text,
      intent: this.classifyIntent(userQuery),
      sources: ['structured-db', 'document-ocr', ...(taxData ? ['deterministic-engine'] : [])],
      assumptions: taxData?.assumptions ?? [],
      refusal: false
    };
  }

  /** Constructs the only prompt allowed to leave the backend. */
  buildGroundedPrompt(userQuery, payrollData, precomputedTaxData = null) {
    const documentText = payrollData.documents.map((document) => document.ocrText).filter(Boolean).join('\n');
    return `SYSTEM PROMPT:\nYou are an internal AI Financial Wellness Assistant. Answer only from the employee context below. Never infer or reveal data about another person. If the answer is missing, say: "I do not have access to that information in your current records." Do not perform independent tax or net-pay calculations.\n\nCONTEXT DATA FOR EMPLOYEE [${payrollData.employeeId}]:\n${JSON.stringify(payrollData, null, 2)}\n\nUPLOADED DOCUMENT OCR:\n${documentText || 'No payslip uploaded. Rely on structured payroll data.'}\n\nPRECOMPUTED TAX DATA:\n${precomputedTaxData ? JSON.stringify(precomputedTaxData, null, 2) : 'None'}\n\nUSER QUESTION:\n${JSON.stringify(userQuery)}\n`;
  }

  classifyIntent(query) {
    if (/tax|80c|invest/i.test(query)) return QueryIntent.TAX_SIMULATION;
    if (/deduct|pf|tds/i.test(query)) return QueryIntent.DEDUCTION_BREAKDOWN;
    if (/salary|pay|hra|gross|net/i.test(query)) return QueryIntent.SALARY_EXPLAIN;
    return QueryIntent.DOCUMENT_GROUNDED;
  }

  getRefusal(query) { return refusalRules.find(({ pattern }) => pattern.test(query)); }
}

export const promptOrchestrator = new PromptOrchestrator();
