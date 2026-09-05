import { companyPolicyFixtures } from '../../fixtures/policy/companyPolicies.js';

/** Provides read-only, non-sensitive company and reference policy context. */
export class CompanyPolicyService {
  search(query = '') {
    const normalizedQuery = String(query).toLowerCase();
    const terms = normalizedQuery.split(/\s+/).filter((term) => term.length > 2);
    return companyPolicyFixtures.filter((policy) => {
      const searchable = `${policy.title} ${policy.category} ${policy.keywords.join(' ')} ${policy.content}`.toLowerCase();
      return terms.length === 0 || terms.some((term) => searchable.includes(term));
    });
  }

  list() {
    return [...companyPolicyFixtures];
  }
}

export const companyPolicyService = new CompanyPolicyService();
