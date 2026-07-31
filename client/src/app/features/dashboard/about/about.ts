/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component } from '@angular/core';

/** About / provider page: who builds and maintains the software. */
@Component({
  selector: 'app-about',
  templateUrl: './about.html',
})
export class About {
  readonly appName = 'WorkProvider360';
  readonly version = '1.0.0';
  readonly year = 2026;
  readonly developer = 'Jasmeet Singh';
  readonly role = 'Full Stack Software Engineer';
  readonly contactEmail = 'support@workprovider360.com';

  readonly stack = [
    'Angular 21 + Tailwind CSS',
    'ASP.NET (.NET 10) — layered Controllers / BLL / DAL',
    'SQL Server (multi-tenant, Dapper + stored procedures)',
    'Cloudinary media, Stripe payments, SignalR live updates',
  ];
}
