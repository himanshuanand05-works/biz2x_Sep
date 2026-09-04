/** OpenAPI document for the financial wellness API. */
export const swaggerDocument = {
  openapi: '3.0.3',
  info: { title: 'AI Financial Wellness API', version: '1.0.0' },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Success: { type: 'object', required: ['success', 'data'], properties: { success: { type: 'boolean', example: true }, data: {} } },
      Error: { type: 'object', required: ['success', 'error'], properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' } } } } }
    }
  },
  paths: {
    '/auth/token': { post: { summary: 'Issue local development tokens', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } } }, responses: { 200: { description: 'Token pair' }, 401: { description: 'Invalid credentials' } } } },
    '/auth/refresh': { post: { summary: 'Refresh an access token', responses: { 200: { description: 'Token pair' } } } },
    '/auth/me': { get: { security: [{ bearerAuth: [] }], summary: 'Get the current employee profile', responses: { 200: { description: 'Profile' } } } },
    '/assistant/query': { post: { security: [{ bearerAuth: [] }], summary: 'Ask a grounded financial question', responses: { 200: { description: 'Grounded answer' } } } }
    ,'/documents/upload': { post: { security: [{ bearerAuth: [] }], summary: 'Upload a financial document', responses: { 201: { description: 'Document metadata and OCR result' } } } }
    ,'/documents': { get: { security: [{ bearerAuth: [] }], summary: 'List employee documents', responses: { 200: { description: 'Documents' } } } }
    ,'/documents/{id}': { get: { security: [{ bearerAuth: [] }], summary: 'Get a document' }, delete: { security: [{ bearerAuth: [] }], summary: 'Archive a document' } }
    ,'/payroll/cycles': { get: { security: [{ bearerAuth: [] }], summary: 'List payroll cycles' } }
    ,'/payroll/{cycle}/breakup': { get: { security: [{ bearerAuth: [] }], summary: 'Get a payroll breakup' } }
    ,'/payroll/ytd': { get: { security: [{ bearerAuth: [] }], summary: 'Get year-to-date payroll' } }
    ,'/policy/deduction-types': { get: { security: [{ bearerAuth: [] }], summary: 'List deduction policy types' } }
    ,'/policy/reimbursement-types': { get: { security: [{ bearerAuth: [] }], summary: 'List reimbursement policy types' } }
    ,'/deductions': { get: { security: [{ bearerAuth: [] }], summary: 'List deductions' }, post: { security: [{ bearerAuth: [] }], summary: 'Create a deduction' } }
    ,'/deductions/{id}': { patch: { security: [{ bearerAuth: [] }], summary: 'Update a deduction' }, delete: { security: [{ bearerAuth: [] }], summary: 'Archive a deduction' } }
    ,'/deductions/eligible': { get: { security: [{ bearerAuth: [] }], summary: 'List eligible deduction types' } }
    ,'/reimbursements': { get: { security: [{ bearerAuth: [] }], summary: 'List reimbursements' }, post: { security: [{ bearerAuth: [] }], summary: 'Create a reimbursement' } }
    ,'/reimbursements/{id}/proof': { post: { security: [{ bearerAuth: [] }], summary: 'Attach reimbursement proof' } }
    ,'/reimbursements/{id}': { delete: { security: [{ bearerAuth: [] }], summary: 'Archive a reimbursement' } }
    ,'/reimbursements/eligible': { get: { security: [{ bearerAuth: [] }], summary: 'List eligible reimbursement types' } }
    ,'/assistant/checklist': { get: { security: [{ bearerAuth: [] }], summary: 'Get the proof checklist' } }
  }
};
