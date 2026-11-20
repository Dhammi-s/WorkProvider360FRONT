/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../../core/models/api-response.model';
import {
  CLAIM_FILING_INDICATORS,
  CLAIM_FORMATS,
  ClaimFormat,
  PayerClaimRulesBase,
} from '../../../../../core/models/billing.model';
import { BillingSettingsService } from '../../../../../core/services/billing-settings.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { BillingCodes } from '../../../settings/billing-settings/billing-codes';

interface EdiForm {
  payerEdiId: string;
  claimFilingIndicator: string | null;
  claimFormat: ClaimFormat;
  requiresAuthorizationNumber: boolean;
}

const DEFAULT_RULES: PayerClaimRulesBase = {
  lineRefG1: false,
  linePos: false,
  dateFormat: 'D8',
  renderingRequired: false,
  maxLines: 50,
  claimNumberSource: 'ClaimId',
};

/**
 * Payer profile ▸ Billing / EDI: EDI payer id, claim filing indicator, claim format,
 * authorization-number rule, 837P claim rules and payer-specific billing codes.
 * SuperAdmin edits ([canEdit]); billing Read can view.
 */
@Component({
  selector: 'app-payer-billing-edi',
  imports: [FormsModule, BillingCodes],
  templateUrl: './payer-billing-edi.html',
})
export class PayerBillingEdi {
  private readonly service = inject(BillingSettingsService);
  private readonly toast = inject(ToastService);

  readonly payerId = input.required<number>();
  readonly canEdit = input(false);
  readonly payerName = input<string | null>(null);

  readonly filingIndicators = CLAIM_FILING_INDICATORS;
  readonly claimFormats = CLAIM_FORMATS;

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly edi = signal<EdiForm | null>(null);
  readonly rules = signal<PayerClaimRulesBase>({ ...DEFAULT_RULES });
  readonly rulesAreDefault = signal(true);

  readonly savingEdi = signal(false);
  readonly savingRules = signal(false);
  readonly ediError = signal<{ message: string; errors: string[] } | null>(null);
  readonly rulesError = signal<{ message: string; errors: string[] } | null>(null);

  constructor() {
    effect(() => {
      const id = this.payerId();
      untracked(() => this.load(id));
    });
  }

  load(id = this.payerId()): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service.payerEdi(id).subscribe({
      next: (d) => {
        this.edi.set({
          payerEdiId: d.payerEdiId ?? '',
          claimFilingIndicator: d.claimFilingIndicator ?? null,
          claimFormat: d.claimFormat ?? 'Invoice',
          requiresAuthorizationNumber: !!d.requiresAuthorizationNumber,
        });
        this.rules.set(d.claimRules ? { ...DEFAULT_RULES, ...d.claimRules } : { ...DEFAULT_RULES });
        this.rulesAreDefault.set(!d.claimRules);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loadError.set(err.message || 'Could not load the payer EDI settings.');
        this.loading.set(false);
      },
    });
  }

  patchEdi(p: Partial<EdiForm>): void {
    if (!this.canEdit()) return;
    this.edi.update((f) => (f ? { ...f, ...p } : f));
  }

  patchRules(p: Partial<PayerClaimRulesBase>): void {
    if (!this.canEdit()) return;
    this.rules.update((r) => ({ ...r, ...p }));
  }

  saveEdi(): void {
    const f = this.edi();
    if (!f) return;
    this.ediError.set(null);
    const ediId = f.payerEdiId.trim();
    if (f.claimFormat === 'Claim837P' && !ediId) {
      this.ediError.set({ message: 'Electronic claims need the payer EDI id (from your clearinghouse payer list).', errors: [] });
      return;
    }
    this.savingEdi.set(true);
    this.service
      .updatePayerEdi(this.payerId(), {
        payerEdiId: ediId || null,
        claimFilingIndicator: f.claimFilingIndicator || null,
        claimFormat: f.claimFormat,
        requiresAuthorizationNumber: f.requiresAuthorizationNumber,
      })
      .subscribe({
        next: (d) => {
          this.savingEdi.set(false);
          this.edi.set({
            payerEdiId: d.payerEdiId ?? '',
            claimFilingIndicator: d.claimFilingIndicator ?? null,
            claimFormat: d.claimFormat,
            requiresAuthorizationNumber: d.requiresAuthorizationNumber,
          });
          this.toast.success('Payer EDI settings saved.');
        },
        error: (err: unknown) => {
          this.savingEdi.set(false);
          const e = apiErrorLines(err, 'Could not save the payer EDI settings.');
          this.ediError.set({ message: e.message || 'Could not save the payer EDI settings.', errors: e.errors });
        },
      });
  }

  saveRules(): void {
    this.rulesError.set(null);
    const r = this.rules();
    const maxLines = Number(r.maxLines);
    if (!Number.isInteger(maxLines) || maxLines < 1 || maxLines > 50) {
      this.rulesError.set({ message: 'Max lines per claim must be 1–50.', errors: [] });
      return;
    }
    this.savingRules.set(true);
    this.service.updateClaimRules(this.payerId(), { ...r, maxLines }).subscribe({
      next: (saved) => {
        this.savingRules.set(false);
        this.rules.set({
          lineRefG1: saved.lineRefG1,
          linePos: saved.linePos,
          dateFormat: saved.dateFormat,
          renderingRequired: saved.renderingRequired,
          maxLines: saved.maxLines,
          claimNumberSource: saved.claimNumberSource,
        });
        this.rulesAreDefault.set(!!saved.isDefault);
        this.toast.success('Claim rules saved.');
      },
      error: (err: unknown) => {
        this.savingRules.set(false);
        const e = apiErrorLines(err, 'Could not save the claim rules.');
        this.rulesError.set({ message: e.message || 'Could not save the claim rules.', errors: e.errors });
      },
    });
  }
}
