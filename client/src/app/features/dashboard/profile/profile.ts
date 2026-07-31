/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { Schedule } from '../../../core/models/scheduler.model';
import { UserDto } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { UserService } from '../../../core/services/user.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Current-user profile plus a change-password form and the user's own schedule. */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, Alert, ImageCropperComponent],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly scheduler = inject(SchedulerService);

  readonly profile = signal<UserDto | null>(null);
  readonly loadError = signal('');

  readonly mySchedules = signal<Schedule[]>([]);
  readonly schedulesLoading = signal(true);

  // Avatar upload + crop
  readonly cropOpen = signal(false);
  readonly fileEvent = signal<Event | null>(null);
  readonly cropped = signal<string | null>(null);
  readonly avatarSaving = signal(false);
  readonly avatarError = signal('');
  readonly avatarNotice = signal('');

  readonly saving = signal(false);
  readonly pwError = signal('');
  readonly pwSuccess = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchPasswords },
  );

  constructor() {
    this.userService.getMe().subscribe({
      next: (me) => this.profile.set(me),
      error: (err: Error) => this.loadError.set(err.message || 'Could not load your profile.'),
    });
    this.loadMySchedules();
  }

  private loadMySchedules(): void {
    const myUserId = this.auth.user()?.userId;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59);
    this.scheduler.list(isoLocal(from), isoLocal(to), myUserId).subscribe({
      next: (rows) => {
        this.mySchedules.set([...rows].sort((a, b) => a.startUtc.localeCompare(b.startUtc)));
        this.schedulesLoading.set(false);
      },
      error: () => {
        this.mySchedules.set([]);
        this.schedulesLoading.set(false);
      },
    });
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700';
      case 'InProgress':
        return 'bg-blue-50 text-blue-700';
      case 'Rejected':
      case 'Cancelled':
        return 'bg-red-50 text-red-700';
      case 'Accepted':
        return 'bg-brand-50 text-brand-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  // ---- Avatar upload + crop ----
  onAvatarFile(event: Event): void {
    this.avatarError.set('');
    this.avatarNotice.set('');
    this.cropped.set(null);
    this.fileEvent.set(event);
    this.cropOpen.set(true);
  }

  onCropped(event: ImageCroppedEvent): void {
    this.cropped.set(event.base64 ?? null);
  }

  onCropFailed(): void {
    this.avatarError.set('That image could not be loaded. Try a PNG or JPG.');
  }

  cancelCrop(): void {
    this.cropOpen.set(false);
    this.fileEvent.set(null);
    this.cropped.set(null);
  }

  saveAvatar(): void {
    const data = this.cropped();
    if (!data) return;
    this.avatarSaving.set(true);
    this.avatarError.set('');
    this.userService.uploadAvatar(data).subscribe({
      next: (updated) => {
        this.avatarSaving.set(false);
        this.cropOpen.set(false);
        this.fileEvent.set(null);
        this.cropped.set(null);
        this.avatarNotice.set('Profile photo updated.');
        this.profile.set(updated);
      },
      error: (err: Error) => {
        this.avatarSaving.set(false);
        this.avatarError.set(err.message || 'Could not save the photo.');
      },
    });
  }

  initials(name: string | undefined): string {
    return (
      (name ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join('') || 'U'
    );
  }

  changePassword(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.pwError.set('');
    this.pwSuccess.set('');

    this.auth.changePassword(this.form.getRawValue()).subscribe({
      next: (msg) => {
        this.pwSuccess.set(msg);
        this.saving.set(false);
        this.form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      error: (err: Error) => {
        this.pwError.set(err.message || 'Could not change the password.');
        this.saving.set(false);
      },
    });
  }
}

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

/** Local wall-clock ISO (no timezone suffix), matching how the scheduler ranges query. */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
