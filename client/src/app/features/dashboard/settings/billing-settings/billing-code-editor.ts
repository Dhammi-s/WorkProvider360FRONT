/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import {
  BillingCode,
  ROUNDING_RULES,
  RoundingRule,
  SaveBillingCodeRequest,
  UNIT_TYPES,
  UnitType,
} from '../../../../core/models/billing.model';
import { ServiceType } from '../../../../core/models/service-type.model';
import { BillingSettingsService } from '../../../../core/services/billing-settings.service';
import { PayerSelect } from '../../../../shared/ui/billing/billing-pickers';

const blank = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

/**
 * Billing code editor modal (create / edit). Used by Settings ▸ Billing (any payer or
 * the service default) and the payer profile's Billing / EDI tab ([fixedPayerId]).
 */
@Component({
  selector: 'app-billing-code-editor',
  imports: [FormsModule, PayerSelect],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/50" (click)="closed.emit()"></div>
      <div class="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h3 class="text-lg font-bold text-slate-900">{{ code() ? 'Edit billing code' : 'New billing code' }}</h3>
        <p class="mt-1 text-sm text-slate-500">
          How a service is billed: procedure code, modifiers, unit and rounding. A payer-specific code wins over the service default.
        </p>

        @if (error()) {
          <div class="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ error() }}
            @if (errors().length) {
              <ul class="mt-1 list-disc pl-5 text-xs">
                @for (e of errors(); track $index) { <li>{{ e }}</li> }
              </ul>
            }
          </div>
        }

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="wp-label">Service type *</label>
            <select class="wp-input" [ngModel]="serviceTypeId()" (ngModelChange)="serviceTypeId.set($event)">
              <option [ngValue]="null">Choose…</option>
              @for (t of serviceTypes(); track t.serviceTypeId) { <option [ngValue]="t.serviceTypeId">{{ t.name }}</option> }
            </select>
          </div>
          <div>
            @if (fixedPayerId() != null) {
              <label class="wp-label">Payer</label>
              <input class="wp-input bg-slate-50" [value]="fixedPayerName() || 'This payer'" disabled />
            } @else {
              <app-payer-select label="Payer" allLabel="Service default (all payers)" [auto]="false" [value]="payerId()" (valueChange)="payerId.set($event)" />
            }
          </div>
          <div>
            <label class="wp-label">Procedure code (HCPCS / CPT) *</label>
            <input class="wp-input uppercase" maxlength="10" placeholder="T1019" [ngModel]="procedureCode()" (ngModelChange)="procedureCode.set($event)" />
          </div>
          <div>
            <label class="wp-label">Modifiers</label>
            <div class="grid grid-cols-4 gap-2">
              @for (i of [0, 1, 2, 3]; track i) {
                <input class="wp-input uppercase !px-2 text-center" maxlength="2" [placeholder]="'M' + (i + 1)" [ngModel]="mods()[i]" (ngModelChange)="setMod(i, $event)" />
              }
            </div>
          </div>
          <div>
            <label class="wp-label">Revenue code</label>
            <input class="wp-input" maxlength="4" placeholder="optional" [ngModel]="revenueCode()" (ngModelChange)="revenueCode.set($event)" />
          </div>
          <div>
            <label class="wp-label">Place of service</label>
            <input class="wp-input" maxlength="2" placeholder="12" [ngModel]="placeOfService()" (ngModelChange)="placeOfService.set($event)" />
            <p class="mt-1 text-[11px] text-slate-400">12 = Home.</p>
          </div>
          <div>
            <label class="wp-label">Unit *</label>
            <select class="wp-input" [ngModel]="unitType()" (ngModelChange)="unitType.set($event)">
              @for (u of unitTypes; track u.value) { <option [value]="u.value">{{ u.label }}</option> }
            </select>
          </div>
          <div>
            <label class="wp-label">Rounding</label>
            <select class="wp-input" [ngModel]="roundingRule()" (ngModelChange)="roundingRule.set($event)">
              @for (r of roundingRules; track r.value) { <option [value]="r.value">{{ r.label }}</option> }
            </select>
          </div>
          <div>
            <label class="wp-label">Minimum units</label>
            <input type="number" min="0" step="0.25" class="wp-input" [ngModel]="minimumUnits()" (ngModelChange)="minimumUnits.set($event)" />
          </div>
          <div>
            <label class="wp-label">Rate per unit {{ rateRequired() ? '*' : '(optional)' }}</label>
            <input type="number" min="0" step="0.0001" class="wp-input" [ngModel]="ratePerUnit()" (ngModelChange)="ratePerUnit.set($event)" placeholder="from the hourly rate" />
            <p class="mt-1 text-[11px] text-slate-400">
              @if (rateRequired()) { Required for Visit / Day units. } @else { Empty = the hourly bill rate converted to the unit. }
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button type="button" (click)="closed.emit()" [disabled]="saving()" class="wp-btn-ghost">Cancel</button>
          <button type="button" (click)="save()" [disabled]="saving()" class="wp-btn-primary">{{ saving() ? 'Saving…' : 'Save code' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class BillingCodeEditor implements OnInit {
  private readonly service = inject(BillingSettingsService);

  readonly code = input<BillingCode | null>(null);
  readonly serviceTypes = input<ServiceType[]>([]);
  /** Lock the payer (payer profile). */
  readonly fixedPayerId = input<number | null>(null);
  readonly fixedPayerName = input<string | null>(null);

  readonly saved = output<BillingCode>();
  readonly closed = output<void>();

  readonly unitTypes = UNIT_TYPES;
  readonly roundingRules = ROUNDING_RULES;

  readonly serviceTypeId = signal<number | null>(null);
  readonly payerId = signal<number | null>(null);
  readonly procedureCode = signal('');
  readonly mods = signal<string[]>(['', '', '', '']);
  readonly revenueCode = signal('');
  readonly placeOfService = signal('12');
  readonly unitType = signal<UnitType>('Minutes15');
  readonly roundingRule = signal<RoundingRule>('Nearest');
  readonly minimumUnits = signal<number | null>(0);
  readonly ratePerUnit = signal<number | null>(null);

  readonly saving = signal(false);
  readonly error = signal('');
  readonly errors = signal<string[]>([]);

  readonly rateRequired = computed(() => this.unitType() === 'Visit' || this.unitType() === 'Day');

  ngOnInit(): void {
    const c = this.code();
    this.payerId.set(this.fixedPayerId());
    if (c) {
      this.serviceTypeId.set(c.serviceTypeId);
      this.payerId.set(this.fixedPayerId() ?? c.payerId);
      this.procedureCode.set(c.procedureCode);
      this.mods.set([c.modifier1 ?? '', c.modifier2 ?? '', c.modifier3 ?? '', c.modifier4 ?? '']);
      this.revenueCode.set(c.revenueCode ?? '');
      this.placeOfService.set(c.placeOfService ?? '12');
      this.unitType.set(c.unitType);
      this.roundingRule.set(c.roundingRule);
      this.minimumUnits.set(c.minimumUnits);
      this.ratePerUnit.set(c.ratePerUnit);
    }
  }

  setMod(i: number, v: string): void {
    this.mods.update((m) => m.map((x, j) => (j === i ? v : x)));
  }

  save(): void {
    this.error.set('');
    this.errors.set([]);
    const code = this.procedureCode().trim().toUpperCase();
    if (this.serviceTypeId() == null) {
      this.error.set('Choose the service type.');
      return;
    }
    if (!code) {
      this.error.set('Enter the procedure code.');
      return;
    }
    const rate = this.ratePerUnit() === null || (this.ratePerUnit() as unknown) === '' ? null : Number(this.ratePerUnit());
    if (this.rateRequired() && (rate == null || !(rate > 0))) {
      this.error.set('Visit and Day units need a rate per unit.');
      return;
    }
    const mods = this.mods().map((m) => blank(m)?.toUpperCase() ?? null);
    const request: SaveBillingCodeRequest = {
      serviceTypeId: this.serviceTypeId()!,
      payerId: this.fixedPayerId() ?? this.payerId(),
      procedureCode: code,
      modifier1: mods[0],
      modifier2: mods[1],
      modifier3: mods[2],
      modifier4: mods[3],
      revenueCode: blank(this.revenueCode()),
      placeOfService: blank(this.placeOfService()) ?? '12',
      unitType: this.unitType(),
      roundingRule: this.roundingRule(),
      minimumUnits: Number(this.minimumUnits()) || 0,
      ratePerUnit: rate,
    };
    const c = this.code();
    this.saving.set(true);
    const req$ = c ? this.service.updateCode(c.billingCodeId, request) : this.service.createCode(request);
    req$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const e = apiErrorLines(err, 'Could not save the billing code.');
        this.error.set(e.message || 'Could not save the billing code.');
        this.errors.set(e.errors);
      },
    });
  }
}
