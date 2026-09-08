/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientService } from '../../../../core/services/client.service';
import { SchedulerService } from '../../../../core/services/scheduler.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Client, ClientAccess } from '../../../../core/models/client.model';
import { ClientVisit } from '../../../../core/models/portal.model';
import { CareLogEntry } from '../../../../core/models/scheduler.model';
import { Alert } from '../../../../shared/ui/alert/alert';
import { VisitCalendar } from '../../../../shared/ui/visit-calendar/visit-calendar';
import { ScheduleEditor } from '../../../../shared/ui/schedule-editor/schedule-editor';
import { CareLog } from '../../../../shared/ui/care-log/care-log';

type Section = 'main' | 'schedule' | 'carelog';

/** Full-page client profile: Main details, a Schedule calendar with inline shift creation, and Care Logs. */
@Component({
  selector: 'app-client-profile',
  imports: [DatePipe, RouterLink, Alert, VisitCalendar, ScheduleEditor, CareLog],
  templateUrl: './client-profile.html',
})
export class ClientProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ClientService);
  private readonly scheduler = inject(SchedulerService);
  private readonly auth = inject(AuthService);

  readonly clientId = Number(this.route.snapshot.paramMap.get('id'));
  readonly canManage = computed(() => !!this.access()?.canManage);

  readonly client = signal<Client | null>(null);
  readonly access = signal<ClientAccess | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly section = signal<Section>('main');

  readonly visits = signal<ClientVisit[]>([]);
  readonly editorOpen = signal(false);
  readonly editorStart = signal<Date | null>(null);

  readonly careLogVisit = signal<ClientVisit | null>(null);
  readonly careLogEntries = signal<CareLogEntry[]>([]);
  readonly careLogBusy = signal(false);

  constructor() {
    this.service.access().subscribe({ next: (a) => this.access.set(a), error: () => {} });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.get(this.clientId).subscribe({
      next: (c) => {
        this.client.set(c);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load client.');
        this.loading.set(false);
      },
    });
    this.loadVisits();
  }

  loadVisits(): void {
    this.service.schedules(this.clientId).subscribe({
      next: (v) => this.visits.set(v),
      error: () => this.visits.set([]),
    });
  }

  setSection(s: Section): void {
    this.section.set(s);
  }

  openEditor(date?: Date): void {
    this.editorStart.set(date ?? new Date());
    this.editorOpen.set(true);
  }

  onSaved(): void {
    this.editorOpen.set(false);
    this.loadVisits();
  }

  openCareLog(visit: ClientVisit): void {
    this.section.set('carelog');
    this.careLogVisit.set(visit);
    this.careLogEntries.set([]);
    this.careLogBusy.set(true);
    this.scheduler.careLog(visit.scheduleId).subscribe({
      next: (log) => {
        this.careLogEntries.set(log);
        this.careLogBusy.set(false);
      },
      error: () => this.careLogBusy.set(false),
    });
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700';
      case 'OnHold':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }
}
