/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService } from '../../../core/services/client.service';
import { ServiceTypeService } from '../../../core/services/service-type.service';
import { OfficeService } from '../../../core/services/office.service';
import { AuthService } from '../../../core/services/auth.service';
import { Client, ClientAccess, ClientSettings, ClientStatus } from '../../../core/models/client.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { Office } from '../../../core/models/office.model';
import { ClientVisit } from '../../../core/models/portal.model';
import { Alert } from '../../../shared/ui/alert/alert';
import { Paginator } from '../../../shared/ui/paginator/paginator';

@Component({
  selector: 'app-clients',
  imports: [ReactiveFormsModule, FormsModule, DatePipe, Alert, Paginator],
  templateUrl: './clients.html',
})
export class Clients {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClientService);
  private readonly serviceTypes = inject(ServiceTypeService);
  private readonly offices = inject(OfficeService);
  private readonly auth = inject(AuthService);

  readonly access = signal<ClientAccess | null>(null);
  readonly settings = signal<ClientSettings | null>(null);
  readonly canManage = computed(() => !!this.access()?.canManage);
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');
  readonly hasAccess = computed(() => (this.access()?.accessLevel ?? 'None') !== 'None');

  readonly allServices = signal<ServiceType[]>([]);
  readonly officeList = signal<Office[]>([]);

  readonly items = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly listError = signal('');
  readonly notice = signal('');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly statusFilter = signal('');
  readonly serviceFilter = signal<number | null>(null);
  readonly search = signal('');

  readonly modalOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly pickedServices = signal<number[]>([]);

  readonly detail = signal<Client | null>(null);
  readonly detailVisits = signal<ClientVisit[]>([]);
  readonly detailBusy = signal(false);
  readonly detailNotice = signal('');
  readonly detailError = signal('');

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: [''],
    phone: [''],
    alternatePhone: [''],
    dateOfBirth: [''],
    gender: [''],
    addressLine1: ['', [Validators.required]],
    addressLine2: [''],
    city: [''],
    state: [''],
    postalCode: [''],
    country: [''],
    officeId: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    emergencyContactRelation: [''],
    preferredLanguage: [''],
    accessInstructions: [''],
    careNotes: [''],
    allergies: [''],
    mobilityNotes: [''],
    startDate: [''],
    notes: [''],
  });

  constructor() {
    this.service.access().subscribe({
      next: (a) => {
        this.access.set(a);
        if (this.hasAccess()) this.load();
        else this.loading.set(false);
      },
      error: () => {
        this.access.set(null);
        this.loading.set(false);
      },
    });
    this.service.getSettings().subscribe({ next: (s) => this.settings.set(s), error: () => {} });
    this.serviceTypes.active().subscribe({ next: (s) => this.allServices.set(s), error: () => {} });
    if (this.auth.roleName() === 'SuperAdmin') {
      this.offices.list().subscribe({ next: (o) => this.officeList.set(o.filter((x) => x.isActive)), error: () => {} });
    }
  }

  req(flag: keyof ClientSettings): boolean {
    const s = this.settings();
    return s ? !!s[flag] : false;
  }

  load(): void {
    this.loading.set(true);
    this.listError.set('');
    this.service
      .list(this.page(), this.pageSize(), {
        status: this.statusFilter() || undefined,
        serviceTypeId: this.serviceFilter() ?? undefined,
        search: this.search() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.listError.set(err.message || 'Could not load clients.');
          this.loading.set(false);
        },
      });
  }

  goPage(p: number): void {
    this.page.set(p);
    this.load();
  }
  setPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(1);
    this.load();
  }
  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  toggleService(id: number): void {
    const current = this.pickedServices();
    this.pickedServices.set(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }
  hasService(id: number): boolean {
    return this.pickedServices().includes(id);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.pickedServices.set([]);
    this.form.reset();
    this.modalOpen.set(true);
  }

  openEdit(c: Client): void {
    this.editingId.set(c.clientId);
    this.formError.set('');
    this.pickedServices.set(c.serviceTypes.map((s) => s.serviceTypeId));
    this.form.reset({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? '',
      phone: c.phone ?? '',
      alternatePhone: c.alternatePhone ?? '',
      dateOfBirth: (c.dateOfBirth ?? '').substring(0, 10),
      gender: c.gender ?? '',
      addressLine1: c.addressLine1,
      addressLine2: c.addressLine2 ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      postalCode: c.postalCode ?? '',
      country: c.country ?? '',
      officeId: c.officeId ?? '',
      emergencyContactName: c.emergencyContactName ?? '',
      emergencyContactPhone: c.emergencyContactPhone ?? '',
      emergencyContactRelation: c.emergencyContactRelation ?? '',
      preferredLanguage: c.preferredLanguage ?? '',
      accessInstructions: c.accessInstructions ?? '',
      careNotes: c.careNotes ?? '',
      allergies: c.allergies ?? '',
      mobilityNotes: c.mobilityNotes ?? '',
      startDate: (c.startDate ?? '').substring(0, 10),
      notes: c.notes ?? '',
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const v = this.form.getRawValue();
    const clean = (s: string) => (s.trim() ? s.trim() : null);
    const payload = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: clean(v.email),
      phone: clean(v.phone),
      alternatePhone: clean(v.alternatePhone),
      dateOfBirth: v.dateOfBirth || null,
      gender: clean(v.gender),
      addressLine1: v.addressLine1.trim(),
      addressLine2: clean(v.addressLine2),
      city: clean(v.city),
      state: clean(v.state),
      postalCode: clean(v.postalCode),
      country: clean(v.country),
      officeId: v.officeId || null,
      emergencyContactName: clean(v.emergencyContactName),
      emergencyContactPhone: clean(v.emergencyContactPhone),
      emergencyContactRelation: clean(v.emergencyContactRelation),
      preferredLanguage: clean(v.preferredLanguage),
      accessInstructions: clean(v.accessInstructions),
      careNotes: clean(v.careNotes),
      allergies: clean(v.allergies),
      mobilityNotes: clean(v.mobilityNotes),
      startDate: v.startDate || null,
      notes: clean(v.notes),
      serviceTypeIds: this.pickedServices(),
    };
    const id = this.editingId();
    const done = (msg: string) => {
      this.saving.set(false);
      this.modalOpen.set(false);
      this.notice.set(msg);
      this.load();
    };
    const fail = (err: Error) => {
      this.formError.set(err.message || 'Could not save the client.');
      this.saving.set(false);
    };
    if (id) this.service.update(id, payload).subscribe({ next: () => done('Client saved.'), error: fail });
    else this.service.create(payload).subscribe({ next: () => done('Client created.'), error: fail });
  }

  openDetail(c: Client): void {
    this.detailNotice.set('');
    this.detailError.set('');
    this.detailVisits.set([]);
    this.service.get(c.clientId).subscribe({
      next: (full) => {
        this.detail.set(full);
        this.service.schedules(c.clientId).subscribe({
          next: (visits) => this.detailVisits.set(visits),
          error: () => this.detailVisits.set([]),
        });
      },
      error: (err: Error) => this.listError.set(err.message || 'Could not load client.'),
    });
  }

  closeDetail(): void {
    this.detail.set(null);
  }

  setStatus(status: ClientStatus): void {
    const c = this.detail();
    if (!c) return;
    this.detailBusy.set(true);
    this.service.setStatus(c.clientId, { status }).subscribe({
      next: (msg) => {
        this.detailBusy.set(false);
        this.detailNotice.set(msg);
        this.detail.set({ ...c, status });
        this.load();
      },
      error: (err: Error) => {
        this.detailBusy.set(false);
        this.detailError.set(err.message || 'Could not update status.');
      },
    });
  }

  togglePortal(enabled: boolean): void {
    const c = this.detail();
    if (!c) return;
    this.detailBusy.set(true);
    this.detailError.set('');
    this.service.setPortalAccess(c.clientId, { enabled }).subscribe({
      next: (updated) => {
        this.detailBusy.set(false);
        this.detailNotice.set(enabled ? 'Portal enabled and credentials emailed.' : 'Portal disabled.');
        this.detail.set(updated);
        this.load();
      },
      error: (err: Error) => {
        this.detailBusy.set(false);
        this.detailError.set(err.message || 'Could not change portal access.');
      },
    });
  }

  resendCredentials(): void {
    const c = this.detail();
    if (!c) return;
    this.detailBusy.set(true);
    this.service.resendCredentials(c.clientId).subscribe({
      next: (msg) => {
        this.detailBusy.set(false);
        this.detailNotice.set(msg);
      },
      error: (err: Error) => {
        this.detailBusy.set(false);
        this.detailError.set(err.message || 'Could not resend credentials.');
      },
    });
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700';
      case 'OnHold':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  }
}
