/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CareAttribute } from '../../../../core/models/compatibility.model';
import { CompatibilityService } from '../../../../core/services/compatibility.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

/** Settings → Care attributes: the agency's list used by client compatibility and caregiver care profiles. */
@Component({
  selector: 'app-care-attributes-settings',
  imports: [FormsModule, Alert, ConfirmDialog],
  template: `
    <div class="wp-card !p-0 overflow-hidden">
      <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 class="text-base font-bold text-slate-900">Care attributes</h2>
          <p class="mt-1 text-sm text-slate-500">
            Languages, skills, preferences (e.g. "Speaks Spanish", "Pet friendly", "Non-smoker"). Clients mark them as
            Required / Preferred / Avoid; caregivers list the ones they have. Suggestions and compatibility checks use them.
          </p>
        </div>
        @if (canEdit()) {
          <button type="button" (click)="openNew()" class="wp-btn-primary">+ Add attribute</button>
        }
      </div>
      <div class="px-6"><app-alert type="error" [message]="error()" /></div>

      @if (loading()) {
        <p class="px-6 py-10 text-center text-sm text-slate-400">Loading…</p>
      } @else if (items().length === 0) {
        <p class="px-6 py-10 text-center text-sm text-slate-500">No care attributes yet.</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th class="px-4 py-3">Name</th>
                <th class="px-4 py-3">Category</th>
                <th class="px-4 py-3 text-right">Clients</th>
                <th class="px-4 py-3 text-right">Caregivers</th>
                <th class="px-4 py-3 text-right">Order</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (a of items(); track a.attributeId) {
                <tr class="hover:bg-slate-50/60" [class.opacity-60]="!a.isActive">
                  <td class="px-4 py-3 font-semibold text-slate-800">{{ a.name }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ a.category || '—' }}</td>
                  <td class="px-4 py-3 text-right text-slate-600">{{ a.clientCount }}</td>
                  <td class="px-4 py-3 text-right text-slate-600">{{ a.caregiverCount }}</td>
                  <td class="px-4 py-3 text-right text-slate-600">{{ a.sortOrder }}</td>
                  <td class="px-4 py-3">
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [class]="a.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">{{ a.isActive ? 'Active' : 'Inactive' }}</span>
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    @if (canEdit()) {
                      <button type="button" (click)="openEdit(a)" class="wp-link text-sm">Edit</button>
                      <button type="button" (click)="toggleActive(a)" [disabled]="busy()" class="ml-3 text-sm font-semibold text-slate-500 hover:text-slate-800">{{ a.isActive ? 'Deactivate' : 'Activate' }}</button>
                      <button type="button" (click)="confirmDelete.set(a)" [disabled]="busy()" class="ml-3 text-sm font-semibold text-red-600 hover:text-red-700">Delete</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (editing(); as e) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/50" (click)="editing.set(null)"></div>
        <div class="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-bold text-slate-900">{{ e.attributeId ? 'Edit attribute' : 'Add attribute' }}</h3>
          <app-alert type="error" [message]="formError()" />
          <div class="mt-4 space-y-4">
            <div>
              <label class="wp-label">Name *</label>
              <input class="wp-input" maxlength="100" [ngModel]="fName()" (ngModelChange)="fName.set($event)" placeholder="e.g. Speaks Spanish" />
            </div>
            <div>
              <label class="wp-label">Category <span class="font-normal text-slate-400">(optional)</span></label>
              <input class="wp-input" maxlength="50" list="care-attr-categories" [ngModel]="fCategory()" (ngModelChange)="fCategory.set($event)" placeholder="e.g. Language" />
              <datalist id="care-attr-categories">
                @for (c of categories(); track c) { <option [value]="c"></option> }
              </datalist>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="wp-label">Sort order</label>
                <input type="number" class="wp-input" [ngModel]="fOrder()" (ngModelChange)="fOrder.set($event)" />
              </div>
              <label class="mt-6 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" [ngModel]="fActive()" (ngModelChange)="fActive.set($event)" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Active
              </label>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" (click)="editing.set(null)" class="wp-btn-ghost">Cancel</button>
            <button type="button" (click)="save()" [disabled]="busy()" class="wp-btn-primary">{{ busy() ? 'Saving…' : 'Save' }}</button>
          </div>
        </div>
      </div>
    }

    @if (confirmDelete(); as d) {
      <app-confirm-dialog tone="danger" [title]="'Delete ' + d.name + '?'"
        message="Attributes used by clients or caregivers cannot be deleted; deactivate them instead."
        confirmLabel="Delete" (confirmed)="doDelete(d)" (cancelled)="confirmDelete.set(null)" />
    }
  `,
})
export class CareAttributesSettings {
  private readonly service = inject(CompatibilityService);
  private readonly toast = inject(ToastService);

  /** Client-Write: add / edit / deactivate / delete. */
  readonly canEdit = input(false);

  readonly items = signal<CareAttribute[]>([]);
  readonly categories = signal<string[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);

  readonly editing = signal<{ attributeId: number | null } | null>(null);
  readonly fName = signal('');
  readonly fCategory = signal('');
  readonly fOrder = signal(0);
  readonly fActive = signal(true);
  readonly formError = signal('');
  readonly confirmDelete = signal<CareAttribute | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.attributes(true).subscribe({
      next: (list) => {
        this.items.set(list);
        this.categories.set([...new Set(list.map((a) => a.category).filter((c): c is string => !!c))].sort());
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load care attributes.');
        this.loading.set(false);
      },
    });
  }

  openNew(): void {
    this.fName.set('');
    this.fCategory.set('');
    this.fOrder.set(this.items().length);
    this.fActive.set(true);
    this.formError.set('');
    this.editing.set({ attributeId: null });
  }

  openEdit(a: CareAttribute): void {
    this.fName.set(a.name);
    this.fCategory.set(a.category ?? '');
    this.fOrder.set(a.sortOrder);
    this.fActive.set(a.isActive);
    this.formError.set('');
    this.editing.set({ attributeId: a.attributeId });
  }

  save(): void {
    const e = this.editing();
    if (!e) return;
    const name = this.fName().trim();
    if (!name) {
      this.formError.set('Enter a name.');
      return;
    }
    const body = {
      name,
      category: this.fCategory().trim() || null,
      isActive: this.fActive(),
      sortOrder: Number(this.fOrder()) || 0,
    };
    this.busy.set(true);
    const req$ = e.attributeId
      ? this.service.updateAttribute(e.attributeId, body)
      : this.service.createAttribute(body);
    req$.subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(null);
        this.toast.success('Care attribute saved.');
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.formError.set(err.message || 'Could not save the attribute.');
      },
    });
  }

  toggleActive(a: CareAttribute): void {
    this.busy.set(true);
    this.service
      .updateAttribute(a.attributeId, { name: a.name, category: a.category, isActive: !a.isActive, sortOrder: a.sortOrder })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.load();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.error.set(err.message || 'Could not change the attribute.');
        },
      });
  }

  doDelete(a: CareAttribute): void {
    this.confirmDelete.set(null);
    this.busy.set(true);
    this.service.deleteAttribute(a.attributeId).subscribe({
      next: (msg) => {
        this.busy.set(false);
        this.toast.success(msg);
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message || 'Could not delete the attribute. Deactivate it instead.');
      },
    });
  }
}
