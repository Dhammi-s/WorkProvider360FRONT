import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { UserDto } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Current-user profile plus a change-password form. */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, DatePipe, Alert],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly profile = signal<UserDto | null>(null);
  readonly loadError = signal('');

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
