/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * Build-time generator for the PRODUCTION Angular environment.
 *
 * Angular is a static SPA, so config is baked at build time. On the hosting
 * provider (e.g. Vercel) set these environment variables; this script writes
 * them into `src/environments/environment.prod.ts` right before `ng build`.
 * Any variable that is not set falls back to the default below, so nothing
 * breaks if you only override some of them.
 *
 *   APP_API_BASE_URL   -> apiBaseUrl   (full deployed API base, e.g. https://api.example.com/api)
 *   APP_HUB_BASE_URL   -> hubBaseUrl   (SignalR origin, e.g. https://api.example.com)
 *   APP_TENANT_DOMAIN  -> tenantDomain (must match an active Agencies.DomainUrl)
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../src/environments/environment.prod.ts');

const env = process.env;
const apiBaseUrl = env.APP_API_BASE_URL || 'https://workprovider360.runasp.net/api';
const hubBaseUrl = env.APP_HUB_BASE_URL || 'https://workprovider360.runasp.net';
const tenantDomain = env.APP_TENANT_DOMAIN || 'work-provider360-front-seven.vercel.app';

const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const contents = `/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE: This file is GENERATED at build time by scripts/set-env.mjs from
   environment variables (APP_API_BASE_URL / APP_HUB_BASE_URL / APP_TENANT_DOMAIN).
   Do not edit by hand for production — set the variables on your host instead.
   ============================================================================= */

export const environment = {
  production: true,
  apiBaseUrl: '${esc(apiBaseUrl)}',
  hubBaseUrl: '${esc(hubBaseUrl)}',
  tenantDomain: '${esc(tenantDomain)}',
};
`;

writeFileSync(target, contents, 'utf8');
console.log(`[set-env] wrote environment.prod.ts  (apiBaseUrl=${apiBaseUrl}, tenantDomain=${tenantDomain})`);
