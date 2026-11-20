# WorkProvider360FRONT — notes for Claude

Angular 21 app in `client\` (standalone components, `inject()`, signals, Tailwind). Deployed on
Vercel (`client\vercel.json`; `scripts\set-env.mjs` writes `environment.prod.ts`).
Full product notes: `D:\b\WorkProvider360\CLAUDE.md`. Design docs: `D:\b\WorkProvider360\docs`.

- Services: `core\services\*.service.ts` — `http.get<ApiResponse<T>>(...).pipe(map(unwrap))`
  against `environment.apiBaseUrl`; models in `core\models`.
- Pages: `features\dashboard\<feature>\`; lazy routes in `app.routes.ts` with `roleGuard` +
  `data.roles`; nav items in `features\dashboard\dashboard-layout\dashboard-layout.ts`.
- UI kit: classes `wp-card`, `wp-input`, `wp-label`, `wp-btn-primary`, `wp-btn-ghost`, `wp-link`;
  `app-stat-card`, `app-paginator`, `app-alert`, `app-confirm-dialog`; modals are inline
  `fixed inset-0` overlays; tables are hand-written inside `wp-card !p-0`.
- Date-only values travel as `yyyy-MM-dd` strings — never `new Date('yyyy-MM-dd')`.
- Help Center content: `features\dashboard\help\help-content.ts` (update it with every feature).
- Build: `cd client; npx ng build`.
