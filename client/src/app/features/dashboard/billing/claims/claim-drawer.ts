/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import { codeWithModifiers, fmtDate, money } from '../../../../core/models/billing.model';
import {
  ClaimDetail,
  ClaimStatus,
  MANUAL_CLAIM_STATUSES,
  claimFrequencyLabel,
  claimStatusClass,
  claimStatusLabel,
  groupValidationErrors,
  parseValidationErrors,
  submissionStatusClass,
} from '../../../../core/models/claims.model';
import { BillingService } from '../../../../core/services/billing.service';
import { ClaimsService } from '../../../../core/services/claims.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { InvoiceDrawer } from '../../../../shared/ui/billing/invoice-drawer/invoice-drawer';

/** Right-side drawer: one claim with lines, diagnoses, submissions, timeline and actions. */
@Component({
  selector: 'app-claim-drawer',
  imports: [FormsModule, ConfirmDialog, InvoiceDrawer],
  templateUrl: './claim-drawer.html',
})
export class ClaimDrawer {
  private readonly claims = inject(ClaimsService);
  private readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);

  readonly claimId = input.required<number>();
  readonly closed = output<void>();
  /** An action changed the claim (or created a new one): the list should reload. */
  readonly changed = output<void>();
  /** Open another claim (e.g. the replacement just created). */
  readonly openClaim = output<number>();

  readonly canManage = this.billing.canManage;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly code = codeWithModifiers;
  readonly statusClass = claimStatusClass;
  readonly statusLabel = claimStatusLabel;
  readonly freqLabel = claimFrequencyLabel;
  readonly subClass = submissionStatusClass;
  readonly manualStatuses = MANUAL_CLAIM_STATUSES;

  readonly detail = signal<ClaimDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);

  readonly errorGroups = computed(() => groupValidationErrors(parseValidationErrors(this.detail()?.claim.validationErrors)));
  readonly events = computed(() =>
    [...(this.detail()?.events ?? [])].sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0)),
  );

  readonly confirm = signal<'replacement' | 'void' | null>(null);
  readonly statusOpen = signal(false);
  readonly sStatus = signal<ClaimStatus>('Accepted');
  readonly sCategory = signal('');
  readonly sCode = signal('');
  readonly sMessage = signal('');
  readonly sIcn = signal('');
  readonly sError = signal('');
  readonly invoiceOpen = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.claimId();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.claims.get(this.claimId()).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message || 'Could not load the claim.');
      },
    });
  }

  canReplace(): boolean {
    const c = this.detail()?.claim;
    return !!c && c.status !== 'Void' && c.frequencyCode !== '8' && !!c.payerClaimControlNumber;
  }

  canVoid(): boolean {
    const c = this.detail()?.claim;
    return !!c && c.status !== 'Void' && c.frequencyCode !== '8';
  }

  validate(): void {
    const c = this.detail()?.claim;
    if (!c) return;
    this.busy.set(true);
    this.claims.validate([c.claimId]).subscribe({
      next: (r) => {
        this.busy.set(false);
        const res = r[0];
        if (res && res.errors.length === 0) this.toast.success(`${res.claimNumber} is valid and Ready.`);
        else this.toast.error(`${c.claimNumber} has ${res?.errors.length ?? 0} validation error(s).`);
        this.load();
        this.changed.emit();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not validate the claim.');
      },
    });
  }

  doConfirm(): void {
    const kind = this.confirm();
    const c = this.detail()?.claim;
    this.confirm.set(null);
    if (!kind || !c) return;
    this.busy.set(true);
    const req$ = kind === 'replacement' ? this.claims.replacement(c.claimId) : this.claims.voidClaim(c.claimId);
    req$.subscribe({
      next: (r) => {
        this.busy.set(false);
        this.changed.emit();
        if (r.claimId !== c.claimId) {
          this.toast.success(
            kind === 'replacement'
              ? `Replacement claim ${r.claimNumber} created (${this.statusLabel(r.status)}).`
              : `Void claim ${r.claimNumber} created (${this.statusLabel(r.status)}).`,
          );
          this.openClaim.emit(r.claimId);
        } else {
          this.toast.success(`${c.claimNumber} is now ${this.statusLabel(r.status)}.`);
          this.load();
        }
        if (r.errors.length) this.toast.error(r.errors.join(' '));
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const e = apiErrorLines(err, 'The action failed.');
        this.toast.error([e.message, ...e.errors].filter(Boolean).join(' '));
      },
    });
  }

  openStatus(): void {
    const c = this.detail()?.claim;
    this.sStatus.set('Accepted');
    this.sCategory.set('');
    this.sCode.set('');
    this.sMessage.set('');
    this.sIcn.set(c?.payerClaimControlNumber ?? '');
    this.sError.set('');
    this.statusOpen.set(true);
  }

  saveStatus(): void {
    const c = this.detail()?.claim;
    if (!c) return;
    this.busy.set(true);
    this.sError.set('');
    this.claims
      .setStatus(c.claimId, {
        status: this.sStatus(),
        category: this.sCategory().trim() || null,
        code: this.sCode().trim() || null,
        message: this.sMessage().trim() || null,
        payerClaimControlNumber: this.sIcn().trim() || null,
      })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.statusOpen.set(false);
          this.toast.success(`${c.claimNumber} set to ${this.statusLabel(r.status)}.`);
          this.load();
          this.changed.emit();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.sError.set(err.message || 'Could not change the status.');
        },
      });
  }
}
