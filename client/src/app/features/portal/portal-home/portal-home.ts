/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { PortalService } from '../../../core/services/portal.service';
import { PortalDashboard } from '../../../core/models/portal.model';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-portal-home',
  imports: [DatePipe, DecimalPipe, Alert],
  templateUrl: './portal-home.html',
})
export class PortalHome {
  private readonly portal = inject(PortalService);
  readonly data = signal<PortalDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.portal.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load your dashboard.');
        this.loading.set(false);
      },
    });
  }
}
