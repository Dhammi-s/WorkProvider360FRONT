/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Announcement } from '../../../core/models/announcement.model';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Announcements: SuperAdmin creates/removes; everyone allowed sees the list. */
@Component({
  selector: 'app-announcements',
  imports: [DatePipe, ReactiveFormsModule, Alert],
  templateUrl: './announcements.html',
})
export class Announcements {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AnnouncementService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');

  readonly canView = signal(false);
  readonly canManage = signal(false);
  readonly items = signal<Announcement[]>([]);

  readonly creating = signal(false);
  readonly saving = signal(false);
  readonly confirmRemoveId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    message: ['', [Validators.required]],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.getView().subscribe({
      next: (v) => {
        this.canView.set(v.canView);
        this.canManage.set(v.canManage);
        this.items.set(v.announcements);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load announcements.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.form.reset({ title: '', message: '' });
    this.creating.set(true);
  }

  publish(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.notice.set('');
    this.service.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.creating.set(false);
        this.notice.set('Announcement published.');
        this.load();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Could not publish.');
      },
    });
  }

  remove(a: Announcement): void {
    this.confirmRemoveId.set(null);
    this.service.deactivate(a.announcementId).subscribe({
      next: (msg) => {
        this.notice.set(msg);
        this.load();
      },
      error: (err: Error) => this.error.set(err.message || 'Could not remove.'),
    });
  }
}
