/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BillingService } from '../../../core/services/billing.service';
import { ClientInvoices } from '../../../shared/ui/client-invoices/client-invoices';
import { BillingAging } from './aging/billing-aging';
import { BillingClaims } from './claims/billing-claims';
import { BillingEligibility } from './eligibility/billing-eligibility';
import { BillingInvoiceRuns } from './invoice-runs/invoice-runs';
import { BillingPayments } from './payments/billing-payments';
import { BillingRemittances } from './remittances/billing-remittances';
import { BillingStatements } from './statements/billing-statements';

export type BillingTab =
  | 'invoices'
  | 'runs'
  | 'payments'
  | 'aging'
  | 'statements'
  | 'claims'
  | 'remittances'
  | 'eligibility';

const TABS: { id: BillingTab; label: string; write?: boolean }[] = [
  { id: 'invoices', label: 'Invoices' },
  { id: 'runs', label: 'Invoice runs' },
  { id: 'payments', label: 'Payments' },
  { id: 'aging', label: 'Aging' },
  { id: 'statements', label: 'Statements' },
  { id: 'claims', label: 'Claims' },
  { id: 'remittances', label: 'Remittances' },
  { id: 'eligibility', label: 'Eligibility' },
];

/**
 * Billing area (ADR-0003/0004/0005): invoices, invoice runs, payments, aging,
 * statements, claims, remittances and eligibility. The tab lives in ?tab=.
 * Visible to staff whose billing access is Read or Write.
 */
@Component({
  selector: 'app-billing',
  imports: [
    ClientInvoices,
    BillingInvoiceRuns,
    BillingPayments,
    BillingAging,
    BillingStatements,
    BillingClaims,
    BillingRemittances,
    BillingEligibility,
  ],
  templateUrl: './billing.html',
})
export class Billing {
  private readonly billing = inject(BillingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly access = this.billing.access;
  readonly accessReady = signal(false);
  readonly noAccess = computed(() => {
    const a = this.access();
    return this.accessReady() && (!a || a.accessLevel === 'None' || !a.canView);
  });
  readonly canManage = this.billing.canManage;

  readonly tabs = TABS;
  readonly tab = signal<BillingTab>('invoices');

  constructor() {
    this.billing
      .loadAccess()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.accessReady.set(true));
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const t = q.get('tab') as BillingTab | null;
      this.tab.set(t && TABS.some((x) => x.id === t) ? t : 'invoices');
    });
  }

  setTab(t: BillingTab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, replaceUrl: true });
  }
}
