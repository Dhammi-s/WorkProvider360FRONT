/**
 * Development environment.
 *
 * `apiBaseUrl` is "/api" so requests go through the Angular dev proxy
 * (see proxy.conf.json), which forwards them to the deployed backend and
 * sidesteps CORS during local development.
 *
 * `tenantDomain` is sent as the `X-Tenant-Domain` header on anonymous
 * requests (login / register / forgot-password). It MUST match an active
 * `Agencies.DomainUrl` row in the backend, otherwise the tenant cannot be
 * resolved and auth calls will fail. Update this to your seeded agency domain.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  // SignalR hub for live location. Relative in dev so the Angular proxy
  // (proxy.conf.json → /hubs, ws:true) forwards it to the backend.
  hubBaseUrl: '',
  // Must match an active Agencies.DomainUrl. The seeded test agency (AgencyId 2)
  // uses 'localhost'. The dev proxy rewrites the Host to runasp.net, so this
  // explicit header is what selects the right tenant.
  tenantDomain: 'localhost',
};
