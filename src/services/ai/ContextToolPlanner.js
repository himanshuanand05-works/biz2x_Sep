import { QueryIntent } from './queryIntent.js';

/** Selects a minimal, backend-controlled set of context tools for a question. */
export class ContextToolPlanner {
  plan(query, { documentId, uploadedDocument, proposed80C } = {}) {
    const intents = this.classifyIntents(query);
    const tools = new Set(['profile']);

    for (const intent of intents) {
      if (intent === QueryIntent.PROOF_CHECKLIST) {
        tools.add('deductions');
        tools.add('policy');
      } else if (intent === QueryIntent.TAX_SIMULATION) {
        tools.add('taxSimulation');
        tools.add('deductions');
        tools.add('policy');
        if (proposed80C == null) tools.add('ytd');
      } else if (intent === QueryIntent.DEDUCTION_BREAKDOWN) {
        tools.add('payroll');
        tools.add('deductions');
        tools.add('documents');
        tools.add('policy');
      } else if (intent === QueryIntent.SALARY_EXPLAIN) {
        tools.add('payrollComparison');
        tools.add('deductions');
        tools.add('reimbursements');
        tools.add('documents');
        tools.add('policy');
      }
    }

    if (intents.includes(QueryIntent.DOCUMENT_GROUNDED)) {
      tools.add('payroll');
      tools.add('documents');
      if (/policy|rule|eligible|reimburse|proof|rank|band|component|tax/i.test(query)) tools.add('policy');
    }

    if (documentId || uploadedDocument) tools.add('documents');
    return { intent: intents[0], intents, tools: [...tools], documentId, policyQuery: query };
  }

  classifyIntents(query) {
    const intents = [];
    if (/missing|checklist|proof|document(s)? required|investment proof/i.test(query)) intents.push(QueryIntent.PROOF_CHECKLIST);
    if (/tax|80c|invest/i.test(query)) intents.push(QueryIntent.TAX_SIMULATION);
    if (/deduct|pf|tds|professional tax/i.test(query)) intents.push(QueryIntent.DEDUCTION_BREAKDOWN);
    if (/\b(?:salary|pay|hra|gross|net|lower|higher)\b/i.test(query)) intents.push(QueryIntent.SALARY_EXPLAIN);
    return intents.length ? intents : [QueryIntent.DOCUMENT_GROUNDED];
  }
}

export const contextToolPlanner = new ContextToolPlanner();