import { userDocumentService } from '../../services/documents/UserDocumentService.js';
import { promptOrchestrator } from '../../services/ai/PromptOrchestrator.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { assistantResponse } from '../responseContracts.js';
import { logger } from '../../config/logger.js';

export async function queryAssistant(req, res) {
  const userId = req.user.userId;
  const query = req.body.query;
  const refusal = promptOrchestrator.getRefusal(query);
  if (refusal) {
    logger.info('User action audited: assistant_query_refusal', {
      userId,
      action: 'assistant_query_refusal',
      intent: 'REFUSAL',
      query,
      details: { reason: refusal.reason }
    });
  }

  let uploadedDocument;
  if (req.file) {
    uploadedDocument = await userDocumentService.uploadDocument(userId, req.file, {
      category: 'PAYSLIP',
      financialYear: req.body.financialYear,
      payrollCycle: req.body.payrollCycle,
      query
    });
  }
  const result = await promptOrchestrator.answer(userId, query, {
    financialYear: req.body.financialYear ?? req.context.activeFinancialYear,
    payrollCycle: req.body.payrollCycle ?? req.context.latestPayrollCycle,
    proposed80C: req.body.proposed80C,
    uploadedDocument
  });

  logger.info('User action audited: assistant_query', {
    userId,
    action: 'assistant_query',
    intent: result.intent,
    query,
    details: {
      refusal: result.refusal,
      sources: result.sources,
      financialYear: req.body.financialYear ?? req.context.activeFinancialYear,
      payrollCycle: req.body.payrollCycle ?? req.context.latestPayrollCycle
    }
  });

  return sendSuccess(res, assistantResponse(result));
}
