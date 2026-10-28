/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientAccess } from '../../../core/models/client.model';
import { Office } from '../../../core/models/office.model';
import { PAYER_TYPES, Payer, payerTypeLabel } from '../../../core/models/payer.model';
import { AuthService } from '../../../core/services/auth.service';
import { ClientService } from '../../../core/services/client.service';
import { OfficeService } from '../../../core/services/office.service';
import { PayerService } from '../../../core/services/payer.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { Paginator } from '../../../shared/ui/paginator/paginator';

/** Agency payer list: search, filter by office / status / type, open or add a payer. */
@Component({
  selector: 'app-payers',
  imports: [FormsModule, RouterLink, Alert, Paginator],
  templateUrl: './payers.html',
})
export class Payers {
  private readonly service = inject(PayerService);
  private readonly clients = inject(ClientService);
  private readonly officeService = inject(OfficeService);
  private readonly auth = inject(AuthService);

  readonly access = signal<ClientAccess | null>(null);
  readonly canManage = computed(() => !!this.access()?.canManage);
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');

  readonly items = signal<Payer[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly search = signal('');
  readonly statusFilter = signal('Active');
  readonly typeFilter = signal('');
  readonly officeFilter = signal('');
  readonly offices = signal<Office[]>([]);

  readonly payerTypes = PAYER_TYPES;
  readonly typeLabel = payerTypeLabel;

  constructor() {
    this.clients.access().subscribe({ next: (a) => this.access.set(a), error: () => {} });
    if (this.isSuperAdmin()) {
      this.officeService.list().subscribe({ next: (o) => this.offices.set(o.filter((x) => x.isActive)), error: () => {} });
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .list(this.page(), this.pageSize(), {
        search: this.search().trim() || undefined,
        status: this.statusFilter() || undefined,
        payerType: this.typeFilter() || undefined,
        officeId: this.officeFilter() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not load payers.');
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  resetFilters(): void {
    this.search.set('');
    this.statusFilter.set('Active');
    this.typeFilter.set('');
    this.officeFilter.set('');
    this.applyFilters();
  }

  onPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSize(n: number): void {
    this.pageSize.set(n);
    this.applyFilters();
  }
}
