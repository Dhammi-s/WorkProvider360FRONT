import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Schedule } from '../../../core/models/scheduler.model';
import { UserDto } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { UserService } from '../../../core/services/user.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Current-user profile plus a change-password form and the user's own schedule. */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, Alert],
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
