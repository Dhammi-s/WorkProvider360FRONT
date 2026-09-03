/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { PortalService } from '../../../core/services/portal.service';
import { ServiceType } from '../../../core/models/service-type.model';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-portal-services',
  imports: [Alert],
  templateUrl: './portal-services.html',
})
export class PortalServices {
  private readonly portal = inject(PortalService);
  readonly items = signal<ServiceType[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.portal.serviceTypes().subscribe({
      next: (s) => {
        this.items.set(s);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load your services.');
        this.loading.set(false);
      },
    });
  }
}
