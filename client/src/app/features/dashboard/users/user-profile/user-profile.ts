/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { SchedulerService } from '../../../../core/services/scheduler.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserDto } from '../../../../core/models/user.model';
import { Schedule } from '../../../../core/models/scheduler.model';
import { Alert } from '../../../../shared/ui/alert/alert';
import { VisitCalendar } from '../../../../shared/ui/visit-calendar/visit-calendar';
import { ScheduleEditor } from '../../../../shared/ui/schedule-editor/schedule-editor';

type Section = 'main' | 'schedule';

/** Full-page user (caregiver/admin/manager) profile: Main details + a Schedule calendar with inline shift creation. */
@Component({
  selector: 'app-user-profile',
  imports: [RouterLink, Alert, VisitCalendar, ScheduleEditor],
  templateUrl: './user-profile.html',
})
export class UserProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly users = inject(UserService);
  private readonly scheduler = inject(SchedulerService);
  private readonly auth = inject(AuthService);

  readonly userId = Number(this.route.snapshot.paramMap.get('id'));
  readonly canManage = computed(() => {
    const r = this.auth.roleName();
    return r === 'SuperAdmin' || r === 'Admin' || r === 'Manager';
  });

  readonly user = signal<UserDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly section = signal<Section>('main');

  readonly shifts = signal<Schedule[]>([]);
  readonly editorOpen = signal(false);
  readonly editorStart = signal<Date | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.users.getById(this.userId).subscribe({
      next: (u) => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load user.');
        this.loading.set(false);
      },
    });
    this.loadShifts();
  }

  loadShifts(): void {
    this.scheduler.list(undefined, undefined, this.userId).subscribe({
      next: (s) => this.shifts.set(s),
      error: () => this.shifts.set([]),
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
    this.loadShifts();
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
