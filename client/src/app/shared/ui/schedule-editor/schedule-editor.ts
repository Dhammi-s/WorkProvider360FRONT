/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { ClientService } from '../../../core/services/client.service';
import { ServiceTypeService } from '../../../core/services/service-type.service';
import { ScheduleConflict } from '../../../core/models/scheduler.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { Client, EligibleCaregiver } from '../../../core/models/client.model';
import { Alert } from '../alert/alert';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Inline (never-modal) Add Shift editor. Renders on the same screen as a card.
 * Reused on the client profile (client locked), the user profile (caregiver
 * locked) and anywhere a shift is created. Checks caregiver double-booking on
 * save and lets the scheduler ignore-and-save.
 */
@Component({
  selector: 'app-schedule-editor',
  standalone: true,
  imports: [FormsModule, DatePipe, Alert],
  templateUrl: './schedule-editor.html',
})
export class ScheduleEditor {
  private readonly scheduler = inject(SchedulerService);
  private readonly clients = inject(ClientService);
  private readonly serviceTypeSvc = inject(ServiceTypeService);

  // A shift is created for this client (client profile) or this caregiver (user profile).
  readonly fixedClientId = input<number | null>(null);
  readonly fixedClientName = input<string>('');
  readonly fixedUserId = input<number | null>(null);
  readonly fixedUserName = input<string>('');
  readonly start = input<Date | null>(null);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  // Form state
  readonly title = signal('');
  readonly clientId = signal<number | null>(null);
  readonly clientName = signal('');
  readonly clientQuery = signal('');
  readonly clientOptions = signal<Client[]>([]);
  readonly serviceTypes = signal<ServiceType[]>([]);
  readonly serviceTypeId = signal<number | null>(null);
  readonly eligible = signal<EligibleCaregiver[]>([]);
  readonly assigneeId = signal<number | null>(null);
  readonly fDate = signal('');
  readonly fStart = signal('09:00');
  readonly fEnd = signal('10:00');
  readonly rate = signal(0);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly conflicts = signal<ScheduleConflict[] | null>(null);

  private readonly clientSearch$ = new Subject<string>();

  readonly caregiverLocked = computed(() => this.fixedUserId() != null);
  readonly clientLocked = computed(() => this.fixedClientId() != null);

  constructor() {
    this.serviceTypeSvc.active().subscribe({ next: (t) => this.serviceTypes.set(t), error: () => {} });

    this.clientSearch$.pipe(debounceTime(300)).subscribe((q) => {
      if (!q.trim()) {
        this.clientOptions.set([]);
        return;
      }
      this.clients.list(1, 8, { status: 'Active', search: q.trim() }).subscribe({
        next: (res) => this.clientOptions.set(res.items),
        error: () => this.clientOptions.set([]),
      });
    });

    // Seed from the fixed context.
    effect(() => {
      const fc = this.fixedClientId();
      if (fc != null && this.clientId() == null) {
        this.clientId.set(fc);
        this.clientName.set(this.fixedClientName());
        this.loadEligible();
      }
      const fu = this.fixedUserId();
      if (fu != null && this.assigneeId() == null) this.assigneeId.set(fu);
    });

    // Seed date/time from the clicked slot.
    effect(() => {
      const s = this.start();
      if (!s) return;
      this.fDate.set(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`);
      const h = s.getHours();
      if (h > 0 || s.getMinutes() > 0) {
        this.fStart.set(`${pad(h)}:${pad(s.getMinutes())}`);
        this.fEnd.set(`${pad((h + 1) % 24)}:${pad(s.getMinutes())}`);
      }
    });
  }

  searchClients(q: string): void {
    this.clientQuery.set(q);
    this.clientSearch$.next(q);
  }

  selectClient(c: Client): void {
    this.clientId.set(c.clientId);
    this.clientName.set(c.fullName);
    this.clientQuery.set('');
    this.clientOptions.set([]);
    this.assigneeId.set(this.fixedUserId());
    this.loadEligible();
    if (!this.title().trim()) this.title.set(c.fullName);
  }

  clearClient(): void {
    this.clientId.set(null);
    this.clientName.set('');
    this.eligible.set([]);
  }

  setServiceType(id: number | null): void {
    this.serviceTypeId.set(id);
    const st = this.serviceTypes().find((t) => t.serviceTypeId === id);
    if (st && this.clientName() && !this.title().trim()) this.title.set(`${st.name} — ${this.clientName()}`);
    this.loadEligible();
  }

  private loadEligible(): void {
    const cid = this.clientId();
    if (cid == null) {
      this.eligible.set([]);
      return;
    }
    this.clients.eligibleCaregivers(cid, this.serviceTypeId() ?? undefined).subscribe({
      next: (list) => this.eligible.set(list),
      error: () => this.eligible.set([]),
    });
  }

  private buildTimes(): { startUtc: string; endUtc: string } | null {
    if (!this.fDate()) return null;
    return { startUtc: `${this.fDate()}T${this.fStart()}:00`, endUtc: `${this.fDate()}T${this.fEnd()}:00` };
  }

  save(): void {
    this.error.set('');
    if (!this.title().trim()) return this.error.set('Title is required.');
    if (this.assigneeId() == null) return this.error.set('Please choose a caregiver.');
    const times = this.buildTimes();
    if (!times || times.endUtc <= times.startUtc) return this.error.set('End time must be after start time.');

    this.busy.set(true);
    // Double-booking check first.
    this.scheduler.conflicts(this.assigneeId()!, times.startUtc, times.endUtc).subscribe({
      next: (list) => {
        if (list.length) {
          this.conflicts.set(list);
          this.busy.set(false);
        } else {
          this.doSave(times);
        }
      },
      error: () => this.doSave(times), // never block scheduling on the check itself
    });
  }

  ignoreConflictsAndSave(): void {
    const times = this.buildTimes();
    if (!times) return;
    this.conflicts.set(null);
    this.busy.set(true);
    this.doSave(times);
  }

  cancelConflicts(): void {
    this.conflicts.set(null);
    this.busy.set(false);
  }

  private doSave(times: { startUtc: string; endUtc: string }): void {
    this.scheduler
      .create({
        title: this.title().trim(),
        clientId: this.clientId(),
        serviceTypeId: this.serviceTypeId(),
        assignedUserId: this.assigneeId()!,
        startUtc: times.startUtc,
        endUtc: times.endUtc,
        payRatePerHour: Number(this.rate()) || 0,
        overtimeMultiplier: 1.5,
        colorTag: null,
        notifyAdmin: false,
        notifyManager: false,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.saved.emit();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.error.set(err.message || 'Could not save the shift.');
        },
      });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
