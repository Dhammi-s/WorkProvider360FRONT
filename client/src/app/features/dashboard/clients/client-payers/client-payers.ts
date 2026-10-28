/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import {
  ClientPayer,
  ClientPayerLinkRequest,
  PAYMENT_DISTRIBUTIONS,
  Payer,
  PaymentDistribution,
  SUBSCRIBER_RELATIONS,
  SavePayerRequest,
  WEEK_DAYS,
  distributionLabel,
  payerTypeLabel,
  rankLabel,
} from '../../../../core/models/payer.model';
import { ClientPayerService } from '../../../../core/services/ClientPayerService';
import { PayerService } from '../../../../core/services/payer.service';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PayerForm } from '../../../../shared/ui/payer-form/payer-form';

type Mode = 'list' | 'pick' | 'create' | 'link' | 'edit';

/** Form state for a client's link to a payer; numbers are strings so empty means "not set". */
interface LinkForm {
  rank: number | null;
  effectiveFrom: string;
  effectiveTo: string;
  policyNumber: string;
  memberId: string;
  groupName: string;
  groupNumber: string;
  isClientSubscriber: boolean;
  subscriberFirstName: string;
  subscriberLastName: string;
  subscriberRelation: string;
  subscriberDateOfBirth: string;
  subscriberGender: string;
  paymentDistribution: PaymentDistribution;
  paymentPercentage: string;
  paymentAmount: string;
  weekStartDay: number | null;
  monthStartDay: number | null;
  notes: string;
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const txt = (v: string) => v.trim() || null;
const num = (v: string) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

function fromLink(p: ClientPayer | null, defaultDistribution: PaymentDistribution): LinkForm {
  return {
    rank: null,
    effectiveFrom: day(p?.effectiveFrom ?? null),
    effectiveTo: day(p?.effectiveTo ?? null),
    policyNumber: p?.policyNumber ?? '',
    memberId: p?.memberId ?? '',
    groupName: p?.groupName ?? '',
    groupNumber: p?.groupNumber ?? '',
    isClientSubscriber: p?.isClientSubscriber ?? true,
    subscriberFirstName: p?.subscriberFirstName ?? '',
    subscriberLastName: p?.subscriberLastName ?? '',
    subscriberRelation: p?.subscriberRelation ?? '',
    subscriberDateOfBirth: day(p?.subscriberDateOfBirth ?? null),
    subscriberGender: p?.subscriberGender ?? '',
    paymentDistribution: p?.paymentDistribution ?? defaultDistribution,
    paymentPercentage: p?.paymentPercentage != null ? String(p.paymentPercentage) : '',
    paymentAmount: p?.paymentAmount != null ? String(p.paymentAmount) : '',
    weekStartDay: p?.weekStartDay ?? null,
    monthStartDay: p?.monthStartDay ?? null,
    notes: p?.linkNotes ?? '',
  };
}

/**
 * A client's payers: rank (1 = primary) with up / down reordering, link an
 * agency payer (search or create one), edit dates / policy / subscriber /
 * payment distribution, activate / deactivate, and sync the payers onto the
 * client's visits that are not invoiced yet.
 */
@Component({
  selector: 'app-client-payers',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, Alert, ConfirmDialog, PayerForm],
  templateUrl: './client-payers.html',
})
export class ClientPayers {
  private readonly clientPayers = inject(ClientPayerService);
  private readonly payerService = inject(PayerService);

  readonly clientId = input.required<number>();
  readonly canManage = input(false);
  /** Emits the client's payers after every load / change (Billing tab uses them). */
  readonly changed = output<ClientPayer[]>();

  readonly payers = signal<ClientPayer[]>([]);
  readonly active = computed(() => this.payers().filter((p) => p.isActive));
  readonly inactive = computed(() => this.payers().filter((p) => !p.isActive));
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  readonly mode = signal<Mode>('list');
  readonly editing = signal<ClientPayer | null>(null);
  readonly picked = signal<Payer | null>(null);
  readonly form = signal<LinkForm>(fromLink(null, 'Remainder'));
  readonly confirmSync = signal(false);
  readonly confirmDeactivate = signal<ClientPayer | null>(null);

  // Payer search (link step 1).
  readonly query = signal('');
  readonly results = signal<Payer[]>([]);
  readonly searching = signal(false);
  private readonly search$ = new Subject<string>();

  readonly distributions = PAYMENT_DISTRIBUTIONS;
  readonly relations = SUBSCRIBER_RELATIONS;
  readonly weekDays = WEEK_DAYS;
  readonly monthDays = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly rankLabel = rankLabel;
  readonly typeLabel = payerTypeLabel;
  readonly distributionLabel = distributionLabel;

  readonly distributionHint = computed(
    () => this.distributions.find((d) => d.value === this.form().paymentDistribution)?.hint ?? '',
  );
  readonly splitTotal = computed(() =>
    this.active()
      .filter((p) => p.paymentDistribution === 'Split' && p.clientPayerId !== this.editing()?.clientPayerId)
      .reduce((s, p) => s + (p.paymentPercentage ?? 0), 0),
  );

  constructor() {
    this.search$.pipe(debounceTime(300)).subscribe((q) => this.runSearch(q));
    effect(() => {
      this.clientId();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.clientPayers.getPayersByClient(this.clientId()).subscribe({
      next: (list) => this.apply(list),
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load payers.');
        this.loading.set(false);
      },
    });
  }

  private apply(list: ClientPayer[], message = ''): void {
    this.payers.set(list);
    this.loading.set(false);
    this.busy.set(false);
    this.notice.set(message);
    this.changed.emit(list);
  }

  private fail(err: Error, fallback: string): void {
    this.busy.set(false);
    this.error.set(err.message || fallback);
  }

  // -------------------------------------------------------------- Link a payer

  startLink(): void {
    this.mode.set('pick');
    this.picked.set(null);
    this.query.set('');
    this.results.set([]);
    this.error.set('');
    this.notice.set('');
    this.runSearch('');
  }

  onQuery(q: string): void {
    this.query.set(q);
    this.search$.next(q);
  }

  private runSearch(q: string): void {
    this.searching.set(true);
    const linked = new Set(this.payers().map((p) => p.payerId));
    this.payerService.list(1, 10, { search: q.trim() || undefined, status: 'Active' }).subscribe({
      next: (r) => {
        this.results.set(r.items.filter((p) => !linked.has(p.payerId)));
        this.searching.set(false);
      },
      error: () => {
        this.results.set([]);
        this.searching.set(false);
      },
    });
  }

  pick(p: Payer): void {
    this.picked.set(p);
    this.form.set(fromLink(null, this.active().length === 0 ? 'Remainder' : 'Split'));
    this.mode.set('link');
  }

  createPayer(request: SavePayerRequest): void {
    this.busy.set(true);
    this.error.set('');
    this.payerService.create(request).subscribe({
      next: (d) => {
        this.busy.set(false);
        this.pick(d.payer);
      },
      error: (err: Error) => this.fail(err, 'Could not create the payer.'),
    });
  }

  // -------------------------------------------------------------- Edit a link

  startEdit(p: ClientPayer): void {
    this.editing.set(p);
    this.form.set(fromLink(p, p.paymentDistribution));
    this.error.set('');
    this.notice.set('');
    this.mode.set('edit');
  }

  cancel(): void {
    this.mode.set('list');
    this.editing.set(null);
    this.picked.set(null);
  }

  patch(p: Partial<LinkForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  private toRequest(): ClientPayerLinkRequest | null {
    const f = this.form();
    if (f.effectiveFrom && f.effectiveTo && f.effectiveTo < f.effectiveFrom) {
      this.error.set('End date cannot be before the start date.');
      return null;
    }
    const pct = num(f.paymentPercentage);
    const amt = num(f.paymentAmount);
    if (f.paymentDistribution === 'Split') {
      if (pct == null || pct < 0 || pct > 100) {
        this.error.set('Enter a payment percentage between 0 and 100.');
        return null;
      }
      if (this.splitTotal() + pct > 100) {
        this.error.set(`Split payers can cover at most 100% together; the others already cover ${this.splitTotal()}%.`);
        return null;
      }
    }
    if (['PerDiem', 'Visit', 'Weekly', 'Monthly'].includes(f.paymentDistribution) && (amt == null || amt <= 0)) {
      this.error.set('Enter the payment amount for this distribution.');
      return null;
    }
    if (f.paymentDistribution === 'Weekly' && f.weekStartDay == null) {
      this.error.set('Choose the day the week starts.');
      return null;
    }
    if (f.paymentDistribution === 'Monthly' && f.monthStartDay == null) {
      this.error.set('Choose the day the month starts.');
      return null;
    }
    if (!f.isClientSubscriber && (!f.subscriberFirstName.trim() || !f.subscriberLastName.trim() || !f.subscriberRelation)) {
      this.error.set("Enter the subscriber's first name, last name and relation to the client.");
      return null;
    }
    this.error.set('');
    return {
      effectiveFrom: f.effectiveFrom || null,
      effectiveTo: f.effectiveTo || null,
      policyNumber: txt(f.policyNumber),
      memberId: txt(f.memberId),
      groupName: txt(f.groupName),
      groupNumber: txt(f.groupNumber),
      isClientSubscriber: f.isClientSubscriber,
      subscriberFirstName: f.isClientSubscriber ? null : txt(f.subscriberFirstName),
      subscriberLastName: f.isClientSubscriber ? null : txt(f.subscriberLastName),
      subscriberRelation: f.isClientSubscriber ? null : f.subscriberRelation || null,
      subscriberDateOfBirth: f.isClientSubscriber ? null : f.subscriberDateOfBirth || null,
      subscriberGender: f.isClientSubscriber ? null : f.subscriberGender || null,
      paymentDistribution: f.paymentDistribution,
      paymentPercentage: f.paymentDistribution === 'Split' ? pct : null,
      paymentAmount: ['PerDiem', 'Visit', 'Weekly', 'Monthly'].includes(f.paymentDistribution) ? amt : null,
      weekStartDay: f.paymentDistribution === 'Weekly' ? f.weekStartDay : null,
      monthStartDay: f.paymentDistribution === 'Monthly' ? f.monthStartDay : null,
      notes: txt(f.notes),
    };
  }

  save(): void {
    const request = this.toRequest();
    if (!request) return;
    this.busy.set(true);
    const editing = this.editing();
    const picked = this.picked();
    const req$ = editing
      ? this.clientPayers.updateLink(this.clientId(), editing.clientPayerId, request)
      : this.clientPayers.linkPayer(this.clientId(), { ...request, payerId: picked!.payerId, rank: this.form().rank });
    req$.subscribe({
      next: (list) => {
        this.cancel();
        this.apply(list, editing ? 'Payer saved.' : `${picked!.payerName} linked. Use "Sync to visits" to apply the change to visits already scheduled.`);
      },
      error: (err: Error) => this.fail(err, 'Could not save the payer.'),
    });
  }

  // ---------------------------------------------------------- Rank / active

  move(p: ClientPayer, delta: -1 | 1): void {
    const ids = this.active().map((x) => x.clientPayerId);
    const i = ids.indexOf(p.clientPayerId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    this.busy.set(true);
    this.error.set('');
    this.clientPayers.reorder(this.clientId(), ids).subscribe({
      next: (list) => this.apply(list, 'Payer order saved.'),
      error: (err: Error) => this.fail(err, 'Could not reorder the payers.'),
    });
  }

  setActive(p: ClientPayer, isActive: boolean): void {
    this.confirmDeactivate.set(null);
    this.busy.set(true);
    this.error.set('');
    this.clientPayers.setActive(this.clientId(), p.clientPayerId, isActive).subscribe({
      next: (list) => this.apply(list, isActive ? `${p.payerName} activated.` : `${p.payerName} deactivated.`),
      error: (err: Error) => this.fail(err, 'Could not change the payer.'),
    });
  }

  sync(): void {
    this.confirmSync.set(false);
    this.busy.set(true);
    this.error.set('');
    this.clientPayers.syncToVisits(this.clientId()).subscribe({
      next: (msg) => {
        this.busy.set(false);
        this.notice.set(msg);
      },
      error: (err: Error) => this.fail(err, 'Could not sync payers.'),
    });
  }

  rankBadge(rank: number | null): string {
    switch (rank) {
      case 1:
        return 'bg-brand-50 text-brand-700';
      case 2:
        return 'bg-sky-50 text-sky-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }
}
