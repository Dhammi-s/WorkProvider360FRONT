/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService } from '../../../core/services/client.service';
import { ServiceTypeService } from '../../../core/services/service-type.service';
import { ClientAccess } from '../../../core/models/client.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-service-types',
  imports: [ReactiveFormsModule, Alert],
  templateUrl: './service-types.html',
})
export class ServiceTypes {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ServiceTypeService);
  private readonly clients = inject(ClientService);

  readonly items = signal<ServiceType[]>([]);
  readonly loading = signal(true);
  readonly listError = signal('');
  readonly notice = signal('');

  readonly access = signal<ClientAccess | null>(null);
  readonly canManage = computed(() => !!this.access()?.canManageServiceTypes);

  readonly modalOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly confirmId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    category: [''],
    colorTag: ['#0ea5e9'],
    sortOrder: [0],
    isActive: [true],
  });

  constructor() {
    this.clients.access().subscribe({
      next: (a) => this.access.set(a),
      error: () => this.access.set(null),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.listError.set('');
    this.service.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.listError.set(err.message || 'Could not load service types.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ name: '', description: '', category: '', colorTag: '#0ea5e9', sortOrder: 0, isActive: true });
    this.modalOpen.set(true);
  }

  openEdit(item: ServiceType): void {
    this.editingId.set(item.serviceTypeId);
    this.formError.set('');
    this.form.reset({
      name: item.name,
      description: item.description ?? '',
      category: item.category ?? '',
      colorTag: item.colorTag ?? '#0ea5e9',
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    this.modalOpen.set(true);
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
    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      category: value.category.trim() || null,
      colorTag: value.colorTag || null,
      sortOrder: Number(value.sortOrder) || 0,
      isActive: value.isActive,
    };
    const id = this.editingId();
    const done = (msg: string) => {
      this.saving.set(false);
      this.modalOpen.set(false);
      this.notice.set(msg);
      this.load();
    };
    const fail = (err: Error) => {
      this.formError.set(err.message || 'Could not save the service type.');
      this.saving.set(false);
    };
    if (id) this.service.update(id, payload).subscribe({ next: () => done('Service type saved.'), error: fail });
    else this.service.create(payload).subscribe({ next: () => done('Service type created.'), error: fail });
  }

  deactivate(item: ServiceType): void {
    this.service.deactivate(item.serviceTypeId).subscribe({
      next: (msg) => {
        this.confirmId.set(null);
        this.notice.set(msg);
        this.load();
      },
      error: (err: Error) => this.listError.set(err.message || 'Could not deactivate.'),
    });
  }
}
