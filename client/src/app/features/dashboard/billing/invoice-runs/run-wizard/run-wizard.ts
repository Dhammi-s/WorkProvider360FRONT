/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../../core/models/api-response.model';
import {
  BillToType,
  FinalizeResult,
  InvoiceListRow,
  InvoiceRunCreated,
  InvoiceRunPreview,
  InvoiceRunPreviewGroup,
  InvoiceRunPreviewLine,
  InvoiceRunRequest,
  cents,
  codeWithModifiers,
  fmtDate,
  fmtWallTime,
  invoiceNumberLabel,
  invoiceStatusClass,
  invoiceStatusLabel,
  money,
  monthEndYmd,
  monthStartYmd,
  periodLabel,
  unitTypeLabel,
} from '../../../../../core/models/billing.model';
import { Office } from '../../../../../core/models/office.model';
import { PAYER_TYPES } from '../../../../../core/models/payer.model';
import { BillingService } from '../../../../../core/services/billing.service';
import { OfficeService } from '../../../../../core/services/office.service';
import { ClientPicker, PayerSelect, PickedClient } from '../../../../../shared/ui/billing/billing-pickers';

type Step = 'setup' | 'preview' | 'drafts' | 'result';

/**
 * New invoice run (full screen): period + filters → preview grouped by bill-to
 * (exclude lines) → create drafts → review drafts → finalize (all or selected) → result.
 */
@Component({
  selector: 'app-run-wizard',
  imports: [FormsModule, ClientPicker, PayerSelect],
  templateUrl: './run-wizard.html',
})
export class RunWizard implements OnInit {
  private readonly billing = inject(BillingService);
  private readonly officeService = inject(OfficeService);

  readonly presetClient = input<PickedClient | null>(null);
  /** Open an existing draft run straight at the review step. */
  readonly resumeRunId = input<number | null>(null);
  readonly closed = output<void>();
  /** Something was created / finalized: the runs list should reload. */
  readonly changed = output<void>();

  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly fmtTime = fmtWallTime;
  readonly periodLabel = periodLabel;
  readonly unitLabel = unitTypeLabel;
  readonly statusClass = invoiceStatusClass;
  readonly statusLabel = invoiceStatusLabel;
  readonly numberLabel = invoiceNumberLabel;
  readonly payerTypes = PAYER_TYPES;
  readonly sumAmount = (s: number, i: { amount: number }) => cents(s + i.amount);

  readonly step = signal<Step>('setup');
  readonly steps: { id: Step; label: string }[] = [
    { id: 'setup', label: 'Period & filters' },
    { id: 'preview', label: 'Preview' },
    { id: 'drafts', label: 'Review drafts' },
    { id: 'result', label: 'Result' },
  ];

  // Step 1
  readonly from = signal(monthStartYmd(-1));
  readonly to = signal(monthEndYmd(-1));
  readonly offices = signal<Office[]>([]);
  readonly officeId = signal<string | null>(null);
  readonly client = signal<PickedClient | null>(null);
  readonly payerId = signal<number | null>(null);
  readonly payerType = signal<string | null>(null);
  readonly billToType = signal<BillToType | null>(null);
  readonly includeUnapproved = signal(false);
  readonly notes = signal('');

  // Step 2
  readonly preview = signal<InvoiceRunPreview | null>(null);
  readonly excluded = signal<Set<string>>(new Set());
  readonly expanded = signal<Set<string>>(new Set());

  // Step 3/4
  readonly created = signal<InvoiceRunCreated | null>(null);
  readonly runId = signal<number | null>(null);
  readonly drafts = signal<InvoiceListRow[]>([]);
  readonly selected = signal<Set<number>>(new Set());

  // Step 5
  readonly result = signal<FinalizeResult | null>(null);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly errors = signal<string[]>([]);
  readonly confirmFinalize = signal<'all' | 'selected' | null>(null);

  readonly rangeError = computed(() => {
    if (!this.from() || !this.to()) return 'Pick both dates.';
    if (this.to() < this.from()) return 'The end date must be on or after the start date.';
    return '';
  });

  /** A line is billed when it is not excluded, has no error and is approved (or unapproved may be invoiced). */
  billable(l: InvoiceRunPreviewLine): boolean {
    if (this.excluded().has(l.key) || l.error) return false;
    if (!l.isApproved && !(this.includeUnapproved() && this.preview()?.canInvoiceUnapproved)) return false;
    return true;
  }

  readonly totals = computed(() => {
    const pv = this.preview();
    let lines = 0;
    let amount = 0;
    let invoices = 0;
    let excluded = 0;
    for (const g of pv?.groups ?? []) {
      let any = false;
      for (const l of g.lines) {
        if (this.billable(l)) {
          lines++;
          amount += l.amount;
          any = true;
        } else if (this.excluded().has(l.key)) excluded++;
      }
      if (any) invoices++;
    }
    return { lines, amount: cents(amount), invoices, excluded };
  });

  readonly warningCount = computed(() =>
    (this.preview()?.groups ?? []).reduce((s, g) => s + g.lines.filter((l) => l.warnings?.length).length, 0),
  );

  readonly draftRows = computed(() => this.drafts().filter((i) => i.status === 'Draft'));

  ngOnInit(): void {
    this.officeService.list().subscribe({ next: (o) => this.offices.set(o.filter((x) => x.isActive)), error: () => {} });
    if (this.presetClient()) this.client.set(this.presetClient());
    const resume = this.resumeRunId();
    if (resume != null) {
      this.runId.set(resume);
      this.step.set('drafts');
      this.loadDrafts();
    }
  }

  setThisMonth(): void {
    this.from.set(monthStartYmd(0));
    this.to.set(monthEndYmd(0));
    this.invalidate();
  }

  setLastMonth(): void {
    this.from.set(monthStartYmd(-1));
    this.to.set(monthEndYmd(-1));
    this.invalidate();
  }

  invalidate(): void {
    this.preview.set(null);
    this.excluded.set(new Set());
  }

  private request(): InvoiceRunRequest {
    return {
      from: this.from(),
      to: this.to(),
      officeId: this.officeId(),
      clientId: this.client()?.clientId ?? null,
      payerId: this.payerId(),
      payerType: this.payerType(),
      billToType: this.billToType(),
      includeUnapproved: this.includeUnapproved(),
      notes: this.notes().trim() || null,
      excludeLineKeys: [...this.excluded()],
    };
  }

  private fail(err: unknown, fallback: string): void {
    this.busy.set(false);
    const e = apiErrorLines(err, fallback);
    this.error.set(e.message);
    this.errors.set(e.errors);
  }

  private clearError(): void {
    this.error.set('');
    this.errors.set([]);
  }

  /** Preview always shows every line (exclusions are kept locally and sent on create). */
  loadPreview(): void {
    if (this.rangeError()) return;
    this.clearError();
    this.busy.set(true);
    this.billing.previewRun({ ...this.request(), excludeLineKeys: [] }).subscribe({
      next: (pv) => {
        this.busy.set(false);
        this.preview.set(pv);
        const keys = new Set(pv.groups.flatMap((g) => g.lines.map((l) => l.key)));
        this.excluded.update((s) => new Set([...s].filter((k) => keys.has(k))));
        // Groups with problems start expanded.
        this.expanded.set(new Set(pv.groups.filter((g) => g.errorCount > 0).map((g) => g.key)));
        this.step.set('preview');
      },
      error: (err) => this.fail(err, 'Could not preview the run.'),
    });
  }

  toggleExpand(g: InvoiceRunPreviewGroup): void {
    this.expanded.update((s) => {
      const n = new Set(s);
      if (n.has(g.key)) n.delete(g.key);
      else n.add(g.key);
      return n;
    });
  }

  expandAll(open: boolean): void {
    this.expanded.set(open ? new Set((this.preview()?.groups ?? []).map((g) => g.key)) : new Set());
  }

  toggleLine(l: InvoiceRunPreviewLine): void {
    this.excluded.update((s) => {
      const n = new Set(s);
      if (n.has(l.key)) n.delete(l.key);
      else n.add(l.key);
      return n;
    });
  }

  groupIncluded(g: InvoiceRunPreviewGroup): boolean {
    return g.lines.some((l) => !this.excluded().has(l.key));
  }

  toggleGroup(g: InvoiceRunPreviewGroup): void {
    const include = !this.groupIncluded(g);
    this.excluded.update((s) => {
      const n = new Set(s);
      for (const l of g.lines) {
        if (include) n.delete(l.key);
        else n.add(l.key);
      }
      return n;
    });
  }

  groupTotal(g: InvoiceRunPreviewGroup): number {
    return cents(g.lines.filter((l) => this.billable(l)).reduce((s, l) => s + l.amount, 0));
  }

  groupLineCount(g: InvoiceRunPreviewGroup): number {
    return g.lines.filter((l) => this.billable(l)).length;
  }

  groupWarnings(g: InvoiceRunPreviewGroup): number {
    return g.lines.filter((l) => l.warnings?.length).length;
  }

  lineCode(l: InvoiceRunPreviewLine): string {
    return codeWithModifiers(l.procedureCode, ...(l.modifiers ?? []));
  }

  createDrafts(): void {
    if (this.totals().lines === 0) {
      this.error.set('Nothing to invoice: every line is excluded, unapproved or has an error.');
      return;
    }
    this.clearError();
    this.busy.set(true);
    this.billing.createRun(this.request()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.created.set(res);
        this.runId.set(res.runId);
        this.changed.emit();
        this.step.set('drafts');
        this.loadDrafts();
      },
      error: (err) => this.fail(err, 'Could not create the draft invoices.'),
    });
  }

  loadDrafts(): void {
    const id = this.runId();
    if (id == null) return;
    this.busy.set(true);
    this.billing.run(id).subscribe({
      next: (d) => {
        this.busy.set(false);
        this.drafts.set(d.invoices);
        this.selected.set(new Set(d.invoices.filter((i) => i.status === 'Draft').map((i) => i.clientInvoiceId)));
      },
      error: (err) => this.fail(err, 'Could not load the draft invoices.'),
    });
  }

  isSelected(id: number): boolean {
    return this.selected().has(id);
  }

  toggleDraft(id: number): void {
    this.selected.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  selectAllDrafts(on: boolean): void {
    this.selected.set(on ? new Set(this.draftRows().map((i) => i.clientInvoiceId)) : new Set());
  }

  deleteDraftInvoice(inv: InvoiceListRow): void {
    // Whole draft removal (lines are reviewed in the Invoices tab drawer).
    this.clearError();
    this.busy.set(true);
    this.billing.deleteDraft(inv.clientInvoiceId).subscribe({
      next: () => {
        this.busy.set(false);
        this.changed.emit();
        this.loadDrafts();
      },
      error: (err) => this.fail(err, 'Could not delete the draft.'),
    });
  }

  doFinalize(): void {
    const mode = this.confirmFinalize();
    this.confirmFinalize.set(null);
    const id = this.runId();
    if (!mode || id == null) return;
    this.clearError();
    this.busy.set(true);
    const req$ =
      mode === 'all' ? this.billing.finalizeRun(id) : this.billing.finalizeMany([...this.selected()]);
    req$.subscribe({
      next: (res) => {
        this.busy.set(false);
        this.result.set(res);
        this.changed.emit();
        this.step.set('result');
      },
      error: (err) => this.fail(err, 'Could not finalize the invoices.'),
    });
  }

  stepIndex(s: Step): number {
    return this.steps.findIndex((x) => x.id === s);
  }

  close(): void {
    if (this.busy()) return;
    this.closed.emit();
  }
}
