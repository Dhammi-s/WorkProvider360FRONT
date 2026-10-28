/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrainingAccess, TrainingAccessResult } from '../../../core/models/training.model';
import { TrainingSessionService } from '../../../core/services/training-session.service';
import { TrainingService } from '../../../core/services/training.service';
import { Alert } from '../../../shared/ui/alert/alert';

/**
 * Access tab: who has the training portal. Super Admin sees training usernames
 * and gets a new password shown once after a reset; Admins / Managers can
 * enable, disable and reset the people below them (passwords are emailed).
 */
@Component({
  selector: 'app-training-access',
  imports: [FormsModule, DatePipe, Alert],
  templateUrl: './training-access.html',
})
export class TrainingAccessPage {
  private readonly training = inject(TrainingService);
  private readonly session = inject(TrainingSessionService);

  readonly isSuperAdmin = computed(() => this.session.user()?.roleName === 'SuperAdmin');
  readonly rows = signal<TrainingAccess[]>([]);
  readonly filter = signal<'all' | 'enabled' | 'disabled'>('all');
  readonly search = signal('');
  readonly loading = signal(true);
  readonly busyId = signal<number | null>(null);
  readonly error = signal('');
  readonly success = signal('');
  /** Credentials shown once after enabling / resetting (Super Admin only). */
  readonly revealed = signal<{ name: string; username: string; password: string } | null>(null);

  readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.rows().filter(
      (r) =>
        (this.filter() === 'all' || (this.filter() === 'enabled') === r.enabled) &&
        (!q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.username ?? '').toLowerCase().includes(q)),
    );
  });

  readonly enabledCount = computed(() => this.rows().filter((r) => r.enabled).length);

  constructor() {
    this.load();
  }

  load(): void {
    this.training.accessList().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  toggle(r: TrainingAccess): void {
    this.handle(r, this.training.setAccess(r.userId, { enabled: !r.enabled }));
  }

  reset(r: TrainingAccess): void {
    this.handle(r, this.training.resetPassword(r.userId));
  }

  private handle(r: TrainingAccess, call: import('rxjs').Observable<{ message?: string | null; data?: TrainingAccessResult | null }>): void {
    this.busyId.set(r.userId);
    this.error.set('');
    this.success.set('');
    call.subscribe({
      next: (res) => {
        this.busyId.set(null);
        const result = res.data;
        if (result) this.rows.update((rows) => rows.map((x) => (x.userId === r.userId ? result.access : x)));
        if (result?.generatedPassword) {
          this.revealed.set({ name: r.fullName, username: result.access.username ?? '', password: result.generatedPassword });
        }
        this.success.set(`${r.fullName}: ${res.message ?? 'saved'}`);
      },
      error: (e: Error) => {
        this.busyId.set(null);
        this.error.set(e.message);
      },
    });
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  roleLabel(role: string): string {
    return role === 'User' ? 'Caregiver' : role === 'SuperAdmin' ? 'Super Admin' : role;
  }
}
