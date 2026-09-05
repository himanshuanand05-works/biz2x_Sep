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
        '/assistant/query': {
            post: {
                security: [{ bearerAuth: [] }],
                summary: 'Ask a grounded question with an optional payslip upload',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                required: ['query', 'financialYear'],
                                properties: {
                                    query: { type: 'string' },
                                    file: { type: 'string', format: 'binary' },
                                    financialYear: { type: 'string', pattern: '^\\d{4}-\\d{4}$' },
                                    payrollCycle: { type: 'string' },
                                    proposed80C: { type: 'string' }
                                }
                            }
                        },
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['query', 'financialYear'],
                                properties: {
                                    query: { type: 'string' },
                                    financialYear: { type: 'string', pattern: '^\\d{4}-\\d{4}$' },
                                    payrollCycle: { type: 'string' },
                                    proposed80C: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: { 200: { description: 'Grounded answer' } }
            }
        },
    }
};
