/** Public response projections. Persistence-only fields never cross the HTTP boundary. */
export function tokenResponse(tokens) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  };
}

export function userResponse(user) {
  if (!user) return null;
  const publicFields = [
    'userId', 'name', 'email', 'employeeCode', 'department', 'designation',
    'rank', 'employeeType', 'location', 'managerId', 'dateOfJoining',
    'employmentStartDate', 'probationEndDate', 'employmentStatus',
    'noticePeriodEndDate', 'exitDate', 'taxRegime', 'activeFinancialYear'
  ];
  return Object.fromEntries(publicFields.filter((field) => user[field] !== undefined)
    .map((field) => [field, user[field]]));
}

export function assistantResponse(result) {
  return {
    answer: result.answer,
    intent: result.intent,
    sources: result.sources ?? [],
    assumptions: result.assumptions ?? [],
    ...(result.checklist ? { checklist: result.checklist } : {}),
    refusal: Boolean(result.refusal)
  };
}

export function healthResponse(timestamp = new Date().toISOString()) {
  return { status: 'UP', timestamp };
}
