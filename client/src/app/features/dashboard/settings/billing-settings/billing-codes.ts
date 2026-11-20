/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BillingCode,
  codeWithModifiers,
  money,
  unitTypeLabel,
} from '../../../../core/models/billing.model';
import { ServiceType } from '../../../../core/models/service-type.model';
import { BillingSettingsService } from '../../../../core/services/billing-settings.service';
import { ServiceTypeService } from '../../../../core/services/service-type.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PayerSelect } from '../../../../shared/ui/billing/billing-pickers';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { BillingCodeEditor } from './billing-code-editor';

/**
 * Billing codes card: per service type (and optionally per payer). With [fixedPayerId]
 * it lists only that payer's overrides (payer profile ▸ Billing / EDI).
 */
@Component({
  selector: 'app-billing-codes',
  imports: [FormsModule, PayerSelect, ConfirmDialog, BillingCodeEditor],
  template: `
    <div class="wp-card overflow-hidden !p-0" [class.mt-6]="!fixedPayerId()">
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <h2 class="text-base font-bold text-slate-900">{{ fixedPayerId() != null ? 'Payer billing code overrides' : 'Billing codes' }}</h2>
          <p class="mt-1 text-sm text-slate-500">
            @if (fixedPayerId() != null) {
              Codes used for this payer instead of the service defaults (Settings ▸ Billing).
            } @else {
              Procedure code, modifiers, unit and rounding per service type. A payer-specific code wins over the service default.
            }
          </p>
        </div>
        @if (canEdit()) {
          <button type="button" (click)="openEditor(null)" class="wp-btn-primary !py-2 text-sm">+ Add code</button>
        }
      </div>

      <div class="flex flex-wrap items-end gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <label class="wp-label">Service type</label>
          <select class="wp-input !w-auto !py-2" [ngModel]="serviceTypeFilter()" (ngModelChange)="serviceTypeFilter.set($event); load()">
            <option [ngValue]="null">All service types</option>
            @for (t of serviceTypes(); track t.serviceTypeId) { <option [ngValue]="t.serviceTypeId">{{ t.name }}</option> }
          </select>
        </div>
        @if (fixedPayerId() == null) {
          <div>
            <app-payer-select label="Payer" allLabel="All (defaults + payers)" [value]="payerFilter()" (valueChange)="payerFilter.set($event); load()" />
          </div>
        }
        <label class="flex items-center gap-2 pb-2 text-sm text-slate-600">
          <input type="checkbox" [ngModel]="includeInactive()" (ngModelChange)="includeInactive.set($event); load()" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          Show inactive
        </label>
      </div>

      @if (loading()) {
        <p class="px-6 py-10 text-center text-sm text-slate-400">Loading…</p>
      } @else if (error()) {
        <p class="px-6 py-10 text-center text-sm text-red-600">{{ error() }}</p>
      } @else if (codes().length === 0) {
        <p class="px-6 py-10 text-center text-sm text-slate-400">
          No billing codes yet. Services without a code bill by the hour at the bill rate.
        </p>
      } @else {
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th class="px-4 py-3">Service type</th>
                @if (fixedPayerId() == null) { <th class="px-4 py-3">Payer</th> }
                <th class="px-4 py-3">Code</th>
                <th class="px-4 py-3">Rev / POS</th>
                <th class="px-4 py-3">Unit</th>
                <th class="px-4 py-3">Rounding</th>
                <th class="px-4 py-3 text-right">Min units</th>
                <th class="px-4 py-3 text-right">Rate / unit</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (c of codes(); track c.billingCodeId) {
                <tr class="hover:bg-slate-50/60" [class.opacity-50]="!c.isActive">
                  <td class="px-4 py-3 font-semibold text-slate-800">{{ c.serviceTypeName }}</td>
                  @if (fixedPayerId() == null) {
                    <td class="px-4 py-3 text-slate-600">{{ c.payerName || 'Default' }}</td>
                  }
                  <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ codeLabel(c) }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ c.revenueCode || '—' }} / {{ c.placeOfService || '—' }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ unitLabel(c.unitType) }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ c.roundingRule }}</td>
                  <td class="px-4 py-3 text-right text-slate-600">{{ c.minimumUnits }}</td>
                  <td class="px-4 py-3 text-right text-slate-700">{{ c.ratePerUnit != null ? money(c.ratePerUnit) : 'From hourly' }}</td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    @if (!c.isActive) {
                      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Inactive</span>
                    } @else if (canEdit()) {
                      <button type="button" (click)="openEditor(c)" class="wp-link text-sm">Edit</button>
                      <button type="button" (click)="confirmDeactivate.set(c)" class="ml-3 text-sm font-semibold text-red-600 hover:underline">Deactivate</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (editorOpen()) {
      <app-billing-code-editor
        [code]="editing()"
        [serviceTypes]="activeServiceTypes()"
        [fixedPayerId]="fixedPayerId()"
        [fixedPayerName]="fixedPayerName()"
        (saved)="onSaved()"
        (closed)="editorOpen.set(false)" />
    }

    @if (confirmDeactivate(); as c) {
      <app-confirm-dialog
        tone="danger"
        [title]="'Deactivate ' + c.procedureCode + '?'"
        message="New invoices stop using this code; invoices already created keep it."
        confirmLabel="Deactivate"
        (confirmed)="deactivate(c)"
        (cancelled)="confirmDeactivate.set(null)" />
    }
  `,
})
export class BillingCodes {
  private readonly service = inject(BillingSettingsService);
  private readonly serviceTypeService = inject(ServiceTypeService);
  private readonly toast = inject(ToastService);

  readonly canEdit = input(false);
  readonly fixedPayerId = input<number | null>(null);
  readonly fixedPayerName = input<string | null>(null);

  readonly codes = signal<BillingCode[]>([]);
  readonly serviceTypes = signal<ServiceType[]>([]);
  readonly activeServiceTypes = signal<ServiceType[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly serviceTypeFilter = signal<number | null>(null);
  readonly payerFilter = signal<number | null>(null);
  readonly includeInactive = signal(false);

  readonly editorOpen = signal(false);
  readonly editing = signal<BillingCode | null>(null);
  readonly confirmDeactivate = signal<BillingCode | null>(null);

  readonly money = money;
  readonly unitLabel = unitTypeLabel;

  constructor() {
    this.serviceTypeService.list().subscribe({
      next: (list) => {
        this.serviceTypes.set(list);
        this.activeServiceTypes.set(list.filter((t) => t.isActive));
      },
      error: () => {},
    });
    effect(() => {
      this.fixedPayerId();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const payerId = this.fixedPayerId() ?? this.payerFilter();
    this.service.codes(this.serviceTypeFilter(), payerId, this.includeInactive()).subscribe({
      next: (list) => {
        // With a payer filter the API may also return the service defaults; the payer tab shows overrides only.
        const fixed = this.fixedPayerId();
        this.codes.set(fixed != null ? list.filter((c) => c.payerId === fixed) : list);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the billing codes.');
        this.loading.set(false);
      },
    });
  }

  codeLabel(c: BillingCode): string {
    return codeWithModifiers(c.procedureCode, c.modifier1, c.modifier2, c.modifier3, c.modifier4);
  }

  openEditor(c: BillingCode | null): void {
    this.editing.set(c);
    this.editorOpen.set(true);
  }

  onSaved(): void {
    this.editorOpen.set(false);
    this.toast.success('Billing code saved.');
    this.load();
  }

  deactivate(c: BillingCode): void {
    this.confirmDeactivate.set(null);
    this.service.deleteCode(c.billingCodeId).subscribe({
      next: () => {
        this.toast.success(`${c.procedureCode} deactivated.`);
        this.load();
      },
      error: (err: Error) => this.toast.error(err.message || 'Could not deactivate the code.'),
    });
  }
}
