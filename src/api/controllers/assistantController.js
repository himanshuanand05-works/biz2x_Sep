import { userDocumentService } from '../../services/documents/UserDocumentService.js';
import { promptOrchestrator } from '../../services/ai/PromptOrchestrator.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { assistantResponse } from '../responseContracts.js';

export async function queryAssistant(req, res) {
  let uploadedDocument;
  if (req.file) {
    uploadedDocument = await userDocumentService.uploadDocument(req.user.userId, req.file, {
      category: 'PAYSLIP',
      financialYear: req.body.financialYear,
      payrollCycle: req.body.payrollCycle
    });
  }
  const result = await promptOrchestrator.answer(req.user.userId, req.body.query, {
    financialYear: req.body.financialYear ?? req.context.activeFinancialYear,
    payrollCycle: req.body.payrollCycle ?? req.context.latestPayrollCycle,
    proposed80C: req.body.proposed80C,
    uploadedDocument
  });
  return sendSuccess(res, assistantResponse(result));
}
