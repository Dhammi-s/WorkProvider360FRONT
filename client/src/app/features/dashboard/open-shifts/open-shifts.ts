/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FillProposal,
  OpenShift,
  SchedulingAccess,
  ShiftOffer,
  ShiftOfferStatus,
  addDaysDateOnly,
  localDateOnly,
  wallDate,
  wallRange,
  wallTime,
} from '../../../core/models/scheduler.model';
import { AuthService } from '../../../core/services/auth.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { ToastService } from '../../../core/services/toast.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Open shifts: managers see interest and assign; caregivers see shifts offered to them. */
@Component({
  selector: 'app-open-shifts',
  imports: [FormsModule, Alert],
  templateUrl: './open-shifts.html',
})
export class OpenShifts {
  private readonly service = inject(SchedulerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** Caregivers (role User) get the "Available shifts" view. */
  readonly isCaregiver = computed(() => this.auth.roleName() === 'User');
  readonly access = signal<SchedulingAccess | null>(null);
  readonly canManage = computed(() => !this.isCaregiver() && !!this.access()?.canManage);

  readonly from = signal(localDateOnly());
  readonly to = signal(addDaysDateOnly(localDateOnly(), 14));
  readonly items = signal<OpenShift[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busyId = signal<number | null>(null);

  // Manager: expanded offers per shift
  readonly expanded = signal<number | null>(null);
  readonly offers = signal<ShiftOffer[]>([]);
  readonly offersLoading = signal(false);

  // Caregiver: response with an optional note
  readonly responding = signal<{ shift: OpenShift; interested: boolean } | null>(null);
  readonly responseNote = signal('');

  // Fill open shifts
  readonly fillOpen = signal(false);
  readonly fillLoading = signal(false);
  readonly proposals = signal<FillProposal[]>([]);
  readonly fillSelected = signal<Set<number>>(new Set());
  readonly fillError = signal('');
  readonly fillResult = signal<{ assigned: number; failed: { scheduleId: number; message: string }[] } | null>(null);

  readonly wallRange = wallRange;
  readonly wallDate = wallDate;
  readonly wallTime = wallTime;

  constructor() {
    if (!this.isCaregiver()) {
      this.service.getAccess().subscribe({ next: (a) => this.access.set(a), error: () => {} });
    }
    this.load();
  }

  load(): void {
    if (this.to() < this.from()) {
      this.error.set('The end date is before the start date.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.service.openShifts(this.from(), this.to()).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load open shifts.');
        this.loading.set(false);
      },
    });
  }

  // ------------------------------------------------------------- Manager

  toggle(s: OpenShift): void {
    if (this.expanded() === s.scheduleId) {
      this.expanded.set(null);
      return;
    }
    this.expanded.set(s.scheduleId);
    this.loadOffers(s.scheduleId);
  }

  private loadOffers(id: number): void {
    this.offers.set([]);
    this.offersLoading.set(true);
    this.service.offers(id).subscribe({
      next: (o) => {
        // Interested first, then by score.
        const rank = (x: ShiftOffer) => (x.status === 'Interested' ? 0 : x.status === 'Offered' ? 1 : 2);
        this.offers.set([...o].sort((a, b) => rank(a) - rank(b) || (b.score ?? -1) - (a.score ?? -1)));
        this.offersLoading.set(false);
      },
      error: (err: Error) => {
        this.offersLoading.set(false);
        this.toast.error(err.message || 'Could not load the offers.');
      },
    });
  }

  assign(s: OpenShift, o: ShiftOffer): void {
    this.busyId.set(s.scheduleId);
    this.service.assign(s.scheduleId, o.userId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`${o.fullName || 'Caregiver'} assigned to ${s.title}.`);
        this.expanded.set(null);
        this.load();
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.error(err.message || 'Could not assign the shift.');
        this.load();
      },
    });
  }

  rebroadcast(s: OpenShift): void {
    this.busyId.set(s.scheduleId);
    this.service.broadcast(s.scheduleId, null).subscribe({
      next: (list) => {
        this.busyId.set(null);
        this.toast.success(`Offered to ${list.length} caregiver${list.length === 1 ? '' : 's'}.`);
        if (this.expanded() === s.scheduleId) this.loadOffers(s.scheduleId);
        this.load();
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.error(err.message || 'Could not broadcast the shift.');
      },
    });
  }

  offerClass(s: ShiftOfferStatus | string): string {
    switch (s) {
      case 'Interested':
      case 'Assigned':
        return 'bg-emerald-50 text-emerald-700';
      case 'Declined':
        return 'bg-red-50 text-red-700';
      case 'Offered':
        return 'bg-sky-50 text-sky-700';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  }

  scoreClass(score: number | null | undefined): string {
    if (score == null) return 'bg-slate-100 text-slate-500';
    if (score >= 75) return 'bg-emerald-600 text-white';
    if (score >= 50) return 'bg-amber-500 text-white';
    return 'bg-slate-400 text-white';
  }

  // ------------------------------------------------------------- Fill

  openFill(): void {
    this.fillOpen.set(true);
    this.fillResult.set(null);
    this.fillError.set('');
    // The fill preview covers at most 31 days.
    const to = this.to() > addDaysDateOnly(this.from(), 30) ? addDaysDateOnly(this.from(), 30) : this.to();
    this.fillLoading.set(true);
    this.service.fillPreview(this.from(), to).subscribe({
      next: (p) => {
        this.proposals.set(p);
        this.fillSelected.set(new Set(p.filter((x) => x.userId != null).map((x) => x.scheduleId)));
        this.fillLoading.set(false);
      },
      error: (err: Error) => {
        this.fillLoading.set(false);
        this.fillError.set(err.message || 'Could not build the proposals.');
      },
    });
  }

  toggleFill(id: number): void {
    this.fillSelected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  applyFill(): void {
    const assignments = this.proposals()
      .filter((p) => p.userId != null && this.fillSelected().has(p.scheduleId))
      .map((p) => ({ scheduleId: p.scheduleId, userId: p.userId! }));
    if (!assignments.length) {
      this.fillError.set('Select at least one proposal.');
      return;
    }
    this.fillLoading.set(true);
    this.fillError.set('');
    this.service.fillApply(assignments).subscribe({
      next: (r) => {
        this.fillLoading.set(false);
        this.fillResult.set(r);
        this.load();
      },
      error: (err: Error) => {
        this.fillLoading.set(false);
        this.fillError.set(err.message || 'Could not assign the shifts.');
      },
    });
  }

  proposalTitle(id: number): string {
    return this.proposals().find((p) => p.scheduleId === id)?.title ?? `#${id}`;
  }

  // ------------------------------------------------------------- Caregiver

  askRespond(s: OpenShift, interested: boolean): void {
    this.responseNote.set('');
    this.responding.set({ shift: s, interested });
  }

  sendResponse(): void {
    const r = this.responding();
    if (!r) return;
    this.responding.set(null);
    this.busyId.set(r.shift.scheduleId);
    this.service
      .respondToOffer(r.shift.scheduleId, { interested: r.interested, note: this.responseNote().trim() || null })
      .subscribe({
        next: (o) => {
          this.busyId.set(null);
          this.toast.success(
            o.status === 'Assigned'
              ? 'The shift is yours. It is now on your schedule.'
              : r.interested
                ? 'Thanks, the office knows you are interested.'
                : 'Shift declined.',
          );
          this.load();
        },
        error: (err: Error) => {
          this.busyId.set(null);
          this.toast.error(err.message || 'Could not send your response.');
          this.load();
        },
      });
  }

  myState(s: OpenShift): string {
    switch (s.myOffer?.status) {
      case 'Interested':
        return 'You are interested';
      case 'Declined':
        return 'You declined';
      case 'Assigned':
        return 'Assigned to you';
      case 'Withdrawn':
        return 'No longer available';
      case 'Expired':
        return 'Expired';
      default:
        return 'Waiting for your answer';
    }
  }

  canRespond(s: OpenShift): boolean {
    const st = s.myOffer?.status;
    return !st || st === 'Offered' || st === 'Interested' || st === 'Declined';
  }
}
