/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import {
  BillingAccessLevel,
  BillingSettings,
  ROUNDING_RULES,
  RoundingRule,
  UpdateBillingSettingsRequest,
} from '../../../../core/models/billing.model';
import { BillingSettingsService } from '../../../../core/services/billing-settings.service';
import { BillingService } from '../../../../core/services/billing.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { BillingCodes } from './billing-codes';
import { ClearinghouseCard } from './clearinghouse-card';
import { QuickbooksCard } from './quickbooks-card';

interface SettingsForm {
  legalName: string;
  npi: string;
  taxId: string;
  taxonomyCode: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  payToAddress1: string;
  payToAddress2: string;
  payToCity: string;
  payToState: string;
  payToPostalCode: string;
  invoicePrefix: string;
  /** null = keep the current sequence. */
  nextInvoiceNumber: number | null;
  paymentTermsDays: number;
  defaultRoundingRule: RoundingRule;
  remitToText: string;
  invoiceFooter: string;
  writeOffApprovalThreshold: number;
  claimRetentionYears: number;
}

type Card = 'provider' | 'invoices' | 'access' | 'eligibility' | 'stripe';

const blank = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

/**
 * Settings ▸ Billing (HLD §5): billing provider, invoices, access, billing codes,
 * clearinghouse, online payments (Stripe Connect), QuickBooks Online and the
 * eligibility vendor. SuperAdmin edits ([canEdit]); billing Read can view.
 */
@Component({
  selector: 'app-billing-settings',
  imports: [FormsModule, DatePipe, NgTemplateOutlet, ConfirmDialog, BillingCodes, ClearinghouseCard, QuickbooksCard],
  templateUrl: './billing-settings.html',
})
export class BillingSettingsTab {
  private readonly service = inject(BillingSettingsService);
  private readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);

  /** SuperAdmin edits; billing Read views. */
  readonly canEdit = input(false);
  /** Stripe / QuickBooks OAuth return (?stripe= / ?qbo=): 'connected' | 'cancelled'. */
  readonly stripeReturn = input<string | null>(null);
  readonly qboReturn = input<string | null>(null);

  readonly canManage = this.billing.canManage;
  readonly roundingRules = ROUNDING_RULES;
  readonly levels: BillingAccessLevel[] = ['None', 'Read', 'Write'];

  readonly settings = signal<BillingSettings | null>(null);
  readonly form = signal<SettingsForm | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saving = signal<Card | null>(null);
  readonly cardError = signal<{ card: Card; message: string; errors: string[] } | null>(null);

  // Access
  readonly adminAccess = signal<BillingAccessLevel>('Write');
  readonly managerAccess = signal<BillingAccessLevel>('None');

  // Eligibility
  readonly eligVendor = signal<'Manual' | 'PVerify'>('Manual');
  readonly eligClientId = signal('');
  readonly eligSecret = signal('');
  readonly eligEditingSecret = signal(false);
  readonly eligClearSecret = signal(false);
  readonly eligRecheckDays = signal(30);
  readonly eligBulkCap = signal(200);

  // Stripe
  readonly stripeBusy = signal(false);
  readonly confirmStripeDisconnect = signal(false);
  readonly returnNotice = signal<{ tone: 'success' | 'info'; text: string } | null>(null);

  constructor() {
    this.load();
    effect(() => {
      const s = this.stripeReturn();
      const q = this.qboReturn();
      untracked(() => {
        if (s === 'connected') this.returnNotice.set({ tone: 'success', text: 'Stripe is connected. Online payments are on.' });
        else if (s === 'cancelled') this.returnNotice.set({ tone: 'info', text: 'Stripe connection was cancelled.' });
        else if (q === 'connected') this.returnNotice.set({ tone: 'success', text: 'QuickBooks Online is connected. Map every service type to an item below.' });
        else if (q === 'cancelled') this.returnNotice.set({ tone: 'info', text: 'QuickBooks connection was cancelled.' });
      });
    });
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service.get().subscribe({
      next: (s) => {
        this.apply(s);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loadError.set(err.message || 'Could not load the billing settings.');
        this.loading.set(false);
      },
    });
  }

  private apply(s: BillingSettings): void {
    this.settings.set(s);
    this.form.set({
      legalName: s.legalName ?? '',
      npi: s.npi ?? '',
      taxId: s.taxId ?? '',
      taxonomyCode: s.taxonomyCode ?? '',
      address1: s.address1 ?? '',
      address2: s.address2 ?? '',
      city: s.city ?? '',
      state: s.state ?? '',
      postalCode: s.postalCode ?? '',
      phone: s.phone ?? '',
      payToAddress1: s.payToAddress1 ?? '',
      payToAddress2: s.payToAddress2 ?? '',
      payToCity: s.payToCity ?? '',
      payToState: s.payToState ?? '',
      payToPostalCode: s.payToPostalCode ?? '',
      invoicePrefix: s.invoicePrefix ?? 'INV',
      nextInvoiceNumber: null,
      paymentTermsDays: s.paymentTermsDays ?? 30,
      defaultRoundingRule: s.defaultRoundingRule ?? 'None',
      remitToText: s.remitToText ?? '',
      invoiceFooter: s.invoiceFooter ?? '',
      writeOffApprovalThreshold: s.writeOffApprovalThreshold ?? 500,
      claimRetentionYears: s.claimRetentionYears ?? 7,
    });
    this.adminAccess.set(s.adminBillingAccess);
    this.managerAccess.set(s.managerBillingAccess);
    this.eligVendor.set(s.eligibilityVendor ?? 'Manual');
    this.eligClientId.set(s.eligibilityClientId ?? '');
    this.eligSecret.set('');
    this.eligEditingSecret.set(false);
    this.eligClearSecret.set(false);
    this.eligRecheckDays.set(s.eligibilityRecheckDays ?? 30);
    this.eligBulkCap.set(s.eligibilityBulkCap ?? 200);
  }

  /** Keeps the edited forms when only connection fields changed (Stripe / QuickBooks toggles). */
  onSettingsChanged(s: BillingSettings): void {
    this.settings.set(s);
  }

  patch(p: Partial<SettingsForm>): void {
    if (!this.canEdit()) return;
    this.form.update((f) => (f ? { ...f, ...p } : f));
  }

  errorFor(card: Card): { message: string; errors: string[] } | null {
    const e = this.cardError();
    return e && e.card === card ? e : null;
  }

  private fail(card: Card, err: unknown, fallback: string): void {
    const e = apiErrorLines(err, fallback);
    this.cardError.set({ card, message: e.message || fallback, errors: e.errors });
  }

  // ------------------------------------------------------------------ Provider + invoices

  /** Provider and invoice settings share one full-replace PUT. */
  saveSettings(card: 'provider' | 'invoices'): void {
    const f = this.form();
    if (!f) return;
    this.cardError.set(null);
    const npi = f.npi.trim();
    if (npi && !/^\d{10}$/.test(npi)) {
      this.cardError.set({ card: 'provider', message: 'The NPI must be 10 digits.', errors: [] });
      return;
    }
    const taxId = f.taxId.replace(/[-\s]/g, '');
    if (taxId && !/^\d{9}$/.test(taxId)) {
      this.cardError.set({ card: 'provider', message: 'The EIN must be 9 digits.', errors: [] });
      return;
    }
    if (!f.invoicePrefix.trim()) {
      this.cardError.set({ card: 'invoices', message: 'Enter the invoice number prefix.', errors: [] });
      return;
    }
    const terms = Number(f.paymentTermsDays);
    if (!Number.isFinite(terms) || terms < 0 || terms > 365) {
      this.cardError.set({ card: 'invoices', message: 'Payment terms must be 0–365 days.', errors: [] });
      return;
    }
    const next = f.nextInvoiceNumber === null || (f.nextInvoiceNumber as unknown) === '' ? null : Number(f.nextInvoiceNumber);
    if (next != null && (!Number.isInteger(next) || next < 1)) {
      this.cardError.set({ card: 'invoices', message: 'The next invoice number must be a whole number of at least 1.', errors: [] });
      return;
    }
    const request: UpdateBillingSettingsRequest = {
      legalName: blank(f.legalName),
      npi: blank(npi),
      taxId: blank(taxId),
      taxonomyCode: blank(f.taxonomyCode)?.toUpperCase() ?? null,
      address1: blank(f.address1),
      address2: blank(f.address2),
      city: blank(f.city),
      state: blank(f.state)?.toUpperCase() ?? null,
      postalCode: blank(f.postalCode),
      phone: blank(f.phone),
      payToAddress1: blank(f.payToAddress1),
      payToAddress2: blank(f.payToAddress2),
      payToCity: blank(f.payToCity),
      payToState: blank(f.payToState)?.toUpperCase() ?? null,
      payToPostalCode: blank(f.payToPostalCode),
      invoicePrefix: f.invoicePrefix.trim(),
      nextInvoiceNumber: next,
      paymentTermsDays: terms,
      defaultRoundingRule: f.defaultRoundingRule,
      remitToText: blank(f.remitToText),
      invoiceFooter: blank(f.invoiceFooter),
      writeOffApprovalThreshold: Number(f.writeOffApprovalThreshold) || 0,
      claimRetentionYears: Number(f.claimRetentionYears) || 7,
    };
    this.saving.set(card);
    this.service.update(request).subscribe({
      next: (s) => {
        this.saving.set(null);
        this.apply(s);
        this.toast.success(card === 'provider' ? 'Billing provider saved.' : 'Invoice settings saved.');
      },
      error: (err: unknown) => {
        this.saving.set(null);
        this.fail(card, err, 'Could not save the billing settings.');
      },
    });
  }

  // ------------------------------------------------------------------ Access

  saveAccess(): void {
    this.cardError.set(null);
    this.saving.set('access');
    this.service.updateAccess({ adminBillingAccess: this.adminAccess(), managerBillingAccess: this.managerAccess() }).subscribe({
      next: (s) => {
        this.saving.set(null);
        this.settings.set(s);
        this.toast.success('Billing access saved.');
      },
      error: (err: unknown) => {
        this.saving.set(null);
        this.fail('access', err, 'Could not save the billing access.');
      },
    });
  }

  // ------------------------------------------------------------------ Eligibility

  saveEligibility(): void {
    this.cardError.set(null);
    const recheck = Number(this.eligRecheckDays());
    const cap = Number(this.eligBulkCap());
    if (!Number.isInteger(recheck) || recheck < 0) {
      this.cardError.set({ card: 'eligibility', message: 'Re-check days must be a whole number.', errors: [] });
      return;
    }
    if (!Number.isInteger(cap) || cap < 1) {
      this.cardError.set({ card: 'eligibility', message: 'The bulk cap must be at least 1.', errors: [] });
      return;
    }
    this.saving.set('eligibility');
    this.service
      .updateEligibility({
        eligibilityVendor: this.eligVendor(),
        eligibilityClientId: blank(this.eligClientId()),
        eligibilitySecret: this.eligEditingSecret() && this.eligSecret().trim() ? this.eligSecret().trim() : null,
        clearSecret: !this.eligEditingSecret() && this.eligClearSecret(),
        eligibilityRecheckDays: recheck,
        eligibilityBulkCap: cap,
      })
      .subscribe({
        next: (s) => {
          this.saving.set(null);
          this.settings.set(s);
          this.eligSecret.set('');
          this.eligEditingSecret.set(false);
          this.eligClearSecret.set(false);
          this.toast.success('Eligibility settings saved.');
        },
        error: (err: unknown) => {
          this.saving.set(null);
          this.fail('eligibility', err, 'Could not save the eligibility settings.');
        },
      });
  }

  // ------------------------------------------------------------------ Stripe

  stripeConnected(): boolean {
    return !!this.settings()?.stripeAccountId;
  }

  connectStripe(): void {
    this.stripeBusy.set(true);
    this.cardError.set(null);
    this.service.stripeConnectUrl(`${location.origin}/dashboard/settings?tab=billing`).subscribe({
      next: (r) => {
        window.location.href = r.url;
      },
      error: (err: unknown) => {
        this.stripeBusy.set(false);
        this.fail('stripe', err, 'Could not start the Stripe connection.');
      },
    });
  }

  disconnectStripe(): void {
    this.confirmStripeDisconnect.set(false);
    this.stripeBusy.set(true);
    this.service.stripeDisconnect().subscribe({
      next: (s) => {
        this.stripeBusy.set(false);
        this.settings.set(s);
        this.toast.success('Stripe disconnected. Online payments are off.');
      },
      error: (err: unknown) => {
        this.stripeBusy.set(false);
        this.fail('stripe', err, 'Could not disconnect Stripe.');
      },
    });
  }

  setOnlinePayments(enabled: boolean): void {
    this.stripeBusy.set(true);
    this.service.stripeEnabled(enabled).subscribe({
      next: (s) => {
        this.stripeBusy.set(false);
        this.settings.set(s);
        this.toast.success(enabled ? 'Online payments enabled.' : 'Online payments disabled.');
      },
      error: (err: unknown) => {
        this.stripeBusy.set(false);
        const s = this.settings();
        if (s) this.settings.set({ ...s });
        this.fail('stripe', err, 'Could not change online payments.');
      },
    });
  }
}
