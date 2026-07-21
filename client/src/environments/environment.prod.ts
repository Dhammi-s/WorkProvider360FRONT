/**
 * Production environment (used automatically by `ng build` via the
 * fileReplacements entry in angular.json — the dev environment.ts is NOT used).
 *
 * Topology: the frontend is hosted on its own origin and calls the API
 * cross-origin, so:
 *   - apiBaseUrl points at the full deployed API URL (no dev proxy in prod).
 *   - The backend must enable CORS for this frontend's origin (see Program.cs).
 *   - tenantDomain is blank: the backend resolves the tenant from the request
 *     Host, which is the API's own host. Make sure the agency's DomainUrl in
 *     the database equals that host (e.g. 'workprovider360.runasp.net').
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://workprovider360.runasp.net/api',
  tenantDomain: '',
};
