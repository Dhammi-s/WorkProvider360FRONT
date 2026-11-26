/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import { codeWithModifiers, dateOnly, fmtDate, money } from '../../../../core/models/billing.model';
import {
  ClaimLine,
  ClaimListRow,
  RemittanceAdjustment,
  RemittanceClaim,
  RemittanceDetail,
  RemittanceLine,
  RemittancePostResult,
  casGroupLabel,
  claimStatusClass,
  claimStatusLabel,
  remittanceStatusClass,
} from '../../../../core/models/claims.model';
import { BillingService } from '../../../../core/services/billing.service';
import { ClaimsService } from '../../../../core/services/claims.service';
import { ToastService } from '../../../../core/services/toast.service';
import { InvoiceDrawer } from '../../../../shared/ui/billing/invoice-drawer/invoice-drawer';

interface MatchDialog {
  claim: RemittanceClaim;
  lines: RemittanceLine[];
  query: string;
  results: ClaimListRow[];
  searching: boolean;
  picked: ClaimListRow | null;
  claimLines: ClaimLine[];
  /** remittanceLineId → claimLineId (null = leave unmatched). */
  lineMap: Record<number, number | null>;
  saving: boolean;
  error: string;
}

/** Full-screen remittance (835) detail: claims, lines, CAS adjustments, matching and posting. */
@Component({
  selector: 'app-remittance-detail',
  imports: [FormsModule, InvoiceDrawer],
  templateUrl: './remittance-detail.html',
})
export class RemittanceDetailPanel {
  private readonly claims = inject(ClaimsService);
  private readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);

  readonly remittanceId = input.required<number>();
  readonly closed = output<void>();
  readonly changed = output<void>();

  readonly canManage = this.billing.canManage;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly code = codeWithModifiers;
  readonly casGroup = casGroupLabel;
  readonly statusClass = remittanceStatusClass;
  readonly claimStatusClass = claimStatusClass;
  readonly claimStatusLabel = claimStatusLabel;

  readonly detail = signal<RemittanceDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly expanded = signal<Set<number>>(new Set());
  readonly selected = signal<Set<number>>(new Set());
  readonly postResult = signal<RemittancePostResult | null>(null);
  readonly match = signal<MatchDialog | null>(null);
  readonly invoiceOpen = signal<number | null>(null);

  readonly postable = computed(() =>
    (this.detail()?.claims ?? []).filter((c) => c.matchStatus !== 'Unmatched' && !c.isPosted),
  );
  readonly unmatchedCount = computed(() => (this.detail()?.claims ?? []).filter((c) => c.matchStatus === 'Unmatched').length);
  readonly plb = computed(() => {
    const raw = this.detail()?.remittance.providerAdjustmentsJson;
    if (!raw) return null;
    try {
      const v = JSON.parse(raw);
      return { pretty: JSON.stringify(v, null, 2) };
    } catch {
      return { pretty: raw };
    }
  });

  constructor() {
    effect(() => {
      this.remittanceId();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.claims.remittance(this.remittanceId()).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
        this.selected.set(new Set());
        // Expand unmatched claims by default.
        this.expanded.set(new Set(d.claims.filter((c) => c.matchStatus === 'Unmatched').map((c) => c.remittanceClaimId)));
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message || 'Could not load the remittance.');
      },
    });
  }

  linesOf(c: RemittanceClaim): RemittanceLine[] {
    return (this.detail()?.lines ?? []).filter((l) => l.remittanceClaimId === c.remittanceClaimId);
  }

  claimAdjustments(c: RemittanceClaim): RemittanceAdjustment[] {
    return (this.detail()?.adjustments ?? []).filter((a) => a.remittanceClaimId === c.remittanceClaimId && a.remittanceLineId == null);
  }

  lineAdjustments(l: RemittanceLine): RemittanceAdjustment[] {
    return (this.detail()?.adjustments ?? []).filter((a) => a.remittanceLineId === l.remittanceLineId);
  }

  toggleExpand(id: number): void {
    this.expanded.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  toggleSelect(id: number): void {
    this.selected.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  rematch(): void {
    this.busy.set(true);
    this.claims.rematch(this.remittanceId()).subscribe({
      next: (rows) => {
        this.busy.set(false);
        const matched = rows.filter((r) => r.matchStatus !== 'Unmatched').length;
        this.toast.success(`${matched} of ${rows.length} claim${rows.length === 1 ? '' : 's'} matched.`);
        this.load();
        this.changed.emit();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not re-match the remittance.');
      },
    });
  }

  post(): void {
    const ids = this.selected().size ? [...this.selected()] : null;
    this.busy.set(true);
    this.claims.post(this.remittanceId(), ids).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.postResult.set(r);
        this.load();
        this.changed.emit();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const e = apiErrorLines(err, 'Could not post the remittance.');
        this.toast.error([e.message, ...e.errors].filter(Boolean).join(' '));
      },
    });
  }

  // ------------------------------------------------------------------ Manual match

  openMatch(c: RemittanceClaim): void {
    this.match.set({
      claim: c,
      lines: this.linesOf(c),
      query: c.patientName ?? c.claimNumber ?? '',
      results: [],
      searching: false,
      picked: null,
      claimLines: [],
      lineMap: {},
      saving: false,
      error: '',
    });
    this.searchClaims();
  }

  patchMatch(p: Partial<MatchDialog>): void {
    this.match.update((m) => (m ? { ...m, ...p } : m));
  }

  searchClaims(): void {
    const m = this.match();
    if (!m) return;
    this.patchMatch({ searching: true });
    this.claims
      .list({ page: 1, pageSize: 15, search: m.query.trim() || null, payerId: this.detail()?.remittance.payerId ?? null })
      .subscribe({
        next: (r) => this.patchMatch({ results: r.items.filter((c) => c.status !== 'Void'), searching: false }),
        error: (err: Error) => this.patchMatch({ searching: false, error: err.message || 'Search failed.' }),
      });
  }

  pickClaim(c: ClaimListRow): void {
    this.patchMatch({ picked: c, claimLines: [], lineMap: {} });
    this.claims.get(c.claimId).subscribe({
      next: (d) => {
        const m = this.match();
        if (!m) return;
        // Pre-map each remittance line to the claim line with the same code and date.
        const used = new Set<number>();
        const map: Record<number, number | null> = {};
        for (const rl of m.lines) {
          const hit = d.lines.find(
            (cl) =>
              !used.has(cl.claimLineId) &&
              (rl.lineControlNumber ? cl.lineControlNumber === rl.lineControlNumber : false),
          ) ??
            d.lines.find(
              (cl) =>
                !used.has(cl.claimLineId) &&
                cl.procedureCode === rl.procedureCode &&
                dateOnly(cl.serviceDate) === dateOnly(rl.serviceDate),
            );
          map[rl.remittanceLineId] = hit?.claimLineId ?? null;
          if (hit) used.add(hit.claimLineId);
        }
        this.patchMatch({ claimLines: d.lines, lineMap: map });
      },
      error: (err: Error) => this.patchMatch({ error: err.message || 'Could not load the claim.' }),
    });
  }

  setLineMap(remitLineId: number, claimLineId: number | null): void {
    const m = this.match();
    if (!m) return;
    this.patchMatch({ lineMap: { ...m.lineMap, [remitLineId]: claimLineId } });
  }

  saveMatch(clear = false): void {
    const m = this.match();
    if (!m) return;
    if (!clear && !m.picked) {
      this.patchMatch({ error: 'Pick the claim this payment belongs to.' });
      return;
    }
    const lineMatches = clear
      ? []
      : Object.entries(m.lineMap)
          .filter(([, v]) => v != null)
          .map(([k, v]) => ({ remittanceLineId: Number(k), claimLineId: v as number }));
    this.patchMatch({ saving: true, error: '' });
    this.claims
      .manualMatch(m.claim.remittanceClaimId, { claimId: clear ? null : m.picked!.claimId, lineMatches })
      .subscribe({
        next: () => {
          this.match.set(null);
          this.toast.success(clear ? 'Match cleared.' : `Matched to ${m.picked!.claimNumber}.`);
          this.load();
          this.changed.emit();
        },
        error: (err: unknown) => {
          const e = apiErrorLines(err, 'Could not save the match.');
          this.patchMatch({ saving: false, error: [e.message, ...e.errors].filter(Boolean).join(' ') });
        },
      });
  }

}
