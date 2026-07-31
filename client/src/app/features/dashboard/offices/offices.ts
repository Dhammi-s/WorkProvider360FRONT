/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Office, OfficeMember, Timezone } from '../../../core/models/office.model';
import { AuthService } from '../../../core/services/auth.service';
import { OfficeService } from '../../../core/services/office.service';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-offices',
  imports: [ReactiveFormsModule, Alert],
  templateUrl: './offices.html',
})
export class Offices {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(OfficeService);
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');

  readonly offices = signal<Office[]>([]);
  readonly timezones = signal<Timezone[]>([]);
  readonly loading = signal(true);
  readonly listError = signal('');
  readonly notice = signal('');

  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly members = signal<OfficeMember[]>([]);
  readonly confirmDeactivateId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    officeName: ['', [Validators.required, Validators.minLength(2)]],
    address: [''],
    phone: [''],
    timezoneId: [''],
    isActive: [true],
  });

  constructor() {
    this.load();
    this.service.timezones().subscribe({
      next: (t) => this.timezones.set(t),
      error: () => this.timezones.set([]),
    });
  }

  load(): void {
    this.loading.set(true);
    this.listError.set('');
    this.service.list().subscribe({
      next: (list) => {
        this.offices.set(list);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.listError.set(err.message || 'Could not load offices.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.members.set([]);
    this.formError.set('');
    this.form.reset({ officeName: '', address: '', phone: '', timezoneId: '', isActive: true });
    this.modalOpen.set(true);
  }

  openEdit(office: Office): void {
    this.editingId.set(office.officeId);
    this.formError.set('');
    this.members.set([]);
    this.form.reset({
      officeName: office.officeName,
      address: office.address ?? '',
      phone: office.phone ?? '',
      timezoneId: office.timezoneId ?? '',
      isActive: office.isActive,
    });
    this.modalOpen.set(true);
    // Load members for the overview (SuperAdmin sees each office's admins).
    this.service.members(office.officeId).subscribe({
      next: (m) => this.members.set(m),
      error: () => this.members.set([]),
    });
  }

  close(): void {
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
    const id = this.editingId();

    const done = (msg: string) => {
      this.saving.set(false);
      this.modalOpen.set(false);
      this.notice.set(msg);
      this.load();
    };
    const fail = (err: Error) => {
      this.formError.set(err.message || 'Could not save the office.');
      this.saving.set(false);
    };

    if (id) {
      this.service
        .update(id, {
          officeName: v.officeName,
          address: v.address || null,
          phone: v.phone || null,
          timezoneId: v.timezoneId || null,
          isActive: v.isActive,
        })
        .subscribe({ next: () => done('Office saved.'), error: fail });
    } else {
      this.service
        .create({
          officeName: v.officeName,
          address: v.address || null,
          phone: v.phone || null,
          timezoneId: v.timezoneId || null,
        })
        .subscribe({ next: () => done('Office created.'), error: fail });
    }
  }

  deactivate(office: Office): void {
    this.confirmDeactivateId.set(null);
    this.service.deactivate(office.officeId).subscribe({
      next: (msg) => {
        this.notice.set(msg);
        this.load();
      },
      error: (err: Error) => this.listError.set(err.message || 'Could not deactivate the office.'),
    });
  }

  timezoneLabel(office: Office): string {
    return office.timezoneName || '—';
  }
}
