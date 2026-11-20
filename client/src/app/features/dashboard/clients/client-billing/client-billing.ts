/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import {
  ClientDiagnosis,
  ClientDiagnosisInput,
  dateOnly,
  fmtDate,
  money,
  todayYmd,
} from '../../../../core/models/billing.model';
import { EligibilityCheck, eligibilityStatusClass } from '../../../../core/models/claims.model';
import { ClientPayer } from '../../../../core/models/payer.model';
import { BillingService } from '../../../../core/services/billing.service';
import { openPdfResponse } from '../../../../core/services/billing-http';
import { EligibilityService } from '../../../../core/services/eligibility.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EligibilityCheckDialog } from '../../../../shared/ui/billing/eligibility-check/eligibility-check';
import { ClientInvoices } from '../../../../shared/ui/client-invoices/client-invoices';

interface DiagnosisRow {
  icdCode: string;
  description: string;
  sequence: number;
  isPrimary: boolean;
  effectiveFrom: string;
  effectiveTo: string;
}

/**
 * Client profile ▸ Billing & Invoice: diagnoses (ICD-10) editor, eligibility per payer,
 * statement and the client's invoices (new billing endpoints).
 */
@Component({
  selector: 'app-client-billing',
  imports: [FormsModule, RouterLink, ClientInvoices, EligibilityCheckDialog],
  templateUrl: './client-billing.html',
})
export class ClientBilling {
  private readonly billing = inject(BillingService);
  private readonly eligibility = inject(EligibilityService);
  private readonly toast = inject(ToastService);

  readonly clientId = input.required<number>();
  readonly clientName = input<string | null>(null);
  readonly payers = input<ClientPayer[]>([]);
  /** Client Write (diagnoses). */
  readonly canManage = input(false);

  readonly fmtDate = fmtDate;
  readonly money = money;
  readonly eligClass = eligibilityStatusClass;
  readonly today = todayYmd();

  readonly access = this.billing.access;
  readonly billingView = computed(() => this.billing.canView());
  readonly billingWrite = computed(() => this.billing.canManage());

  // Diagnoses
  readonly diagnoses = signal<ClientDiagnosis[]>([]);
  readonly rows = signal<DiagnosisRow[]>([]);
  readonly editing = signal(false);
  readonly dxLoading = signal(false);
  readonly dxSaving = signal(false);
  readonly dxError = signal('');
  readonly dxErrors = signal<string[]>([]);
  readonly showEnded = signal(false);
  readonly currentDiagnoses = computed(() =>
    this.diagnoses().filter((d) => !d.effectiveTo || dateOnly(d.effectiveTo) >= this.today),
  );
  readonly visibleDiagnoses = computed(() => (this.showEnded() ? this.diagnoses() : this.currentDiagnoses()));

  // Eligibility
  readonly latest = signal<EligibilityCheck[]>([]);
  readonly eligTarget = signal<{ clientPayerId: number | null; payerName: string | null } | null>(null);
  readonly activePayers = computed(() => this.payers().filter((p) => p.isActive));

  // Statement
  readonly statementBusy = signal(false);

  constructor() {
    this.billing.loadAccess().subscribe();
    effect(() => {
      const id = this.clientId();
      untracked(() => {
        this.loadDiagnoses(id);
        this.loadLatest(id);
      });
    });
  }

  // ------------------------------------------------------------- Diagnoses

  loadDiagnoses(id = this.clientId()): void {
    this.dxLoading.set(true);
    this.billing.diagnoses(id).subscribe({
      next: (list) => {
        this.diagnoses.set([...list].sort((a, b) => a.sequence - b.sequence));
        this.dxLoading.set(false);
      },
      error: (err: Error) => {
        this.dxLoading.set(false);
        this.dxError.set(err.message || 'Could not load the diagnoses.');
      },
    });
  }

  startEdit(): void {
    this.dxError.set('');
    this.dxErrors.set([]);
    this.rows.set(
      this.diagnoses().map((d) => ({
        icdCode: d.icdCode,
        description: d.description ?? '',
        sequence: d.sequence,
        isPrimary: d.isPrimary,
        effectiveFrom: dateOnly(d.effectiveFrom),
        effectiveTo: dateOnly(d.effectiveTo),
      })),
    );
    if (this.rows().length === 0) this.addRow();
    this.editing.set(true);
  }

  addRow(): void {
    this.rows.update((rs) => {
      const next = rs.reduce((m, r) => Math.max(m, Number(r.sequence) || 0), 0) + 1;
      return [...rs, { icdCode: '', description: '', sequence: next, isPrimary: rs.length === 0, effectiveFrom: '', effectiveTo: '' }];
    });
  }

  removeRow(i: number): void {
    this.rows.update((rs) => rs.filter((_, idx) => idx !== i));
  }

  patchRow(i: number, patch: Partial<DiagnosisRow>): void {
    this.rows.update((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  setPrimary(i: number): void {
    this.rows.update((rs) => rs.map((r, idx) => ({ ...r, isPrimary: idx === i })));
  }

  /** ICD-10 codes are stored upper-case without the dot. */
  normalizeCode(v: string): string {
    return (v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  saveDiagnoses(): void {
    this.dxError.set('');
    this.dxErrors.set([]);
    const list: ClientDiagnosisInput[] = this.rows()
      .filter((r) => r.icdCode.trim())
      .map((r) => ({
        icdCode: this.normalizeCode(r.icdCode),
        description: r.description.trim() || null,
        sequence: Number(r.sequence) || 1,
        isPrimary: !!r.isPrimary,
        effectiveFrom: r.effectiveFrom || null,
        effectiveTo: r.effectiveTo || null,
      }));
    const problems: string[] = [];
    for (const d of list) {
      if (!/^[A-Z][0-9][0-9A-Z]{1,5}$/.test(d.icdCode)) problems.push(`${d.icdCode}: not a valid ICD-10 code (e.g. F03.90 → F0390).`);
      if (d.effectiveFrom && d.effectiveTo && d.effectiveTo < d.effectiveFrom) problems.push(`${d.icdCode}: the end date is before the start date.`);
    }
    const current = list.filter((d) => !d.effectiveTo || d.effectiveTo >= this.today);
    if (current.length > 12) problems.push('At most 12 current diagnoses can be listed on a claim.');
    if (current.length && current.filter((d) => d.isPrimary).length !== 1) problems.push('Mark exactly one current diagnosis as primary.');
    const codes = current.map((d) => d.icdCode);
    if (new Set(codes).size !== codes.length) problems.push('A current diagnosis is listed twice.');
    if (problems.length) {
      this.dxError.set('Please fix the diagnoses:');
      this.dxErrors.set(problems);
      return;
    }
    this.dxSaving.set(true);
    this.billing.saveDiagnoses(this.clientId(), list).subscribe({
      next: (saved) => {
        this.dxSaving.set(false);
        this.diagnoses.set([...saved].sort((a, b) => a.sequence - b.sequence));
        this.editing.set(false);
        this.toast.success('Diagnoses saved.');
      },
      error: (err: unknown) => {
        this.dxSaving.set(false);
        const e = apiErrorLines(err, 'Could not save the diagnoses.');
        this.dxError.set(e.message);
        this.dxErrors.set(e.errors);
      },
    });
  }

  // ------------------------------------------------------------- Eligibility

  loadLatest(id = this.clientId()): void {
    this.eligibility.latest(id).subscribe({ next: (l) => this.latest.set(l), error: () => this.latest.set([]) });
  }

  latestFor(p: ClientPayer): EligibilityCheck | null {
    return this.latest().find((c) => c.clientPayerId === p.clientPayerId) ?? null;
  }

  checkEligibility(p: ClientPayer | null): void {
    this.eligTarget.set(p ? { clientPayerId: p.clientPayerId, payerName: p.payerName } : { clientPayerId: null, payerName: null });
  }

  onEligibilityClosed(): void {
    this.eligTarget.set(null);
    this.loadLatest();
  }

  // ------------------------------------------------------------- Statement

  async statementPdf(): Promise<void> {
    this.statementBusy.set(true);
    try {
      const res = await firstValueFrom(this.billing.statementPdf({ clientId: this.clientId(), asOf: this.today }));
      openPdfResponse(res, `statement-${this.clientId()}.pdf`);
    } catch (err) {
      this.toast.error((err as Error)?.message || 'Could not create the statement.');
    }
    this.statementBusy.set(false);
  }
}
