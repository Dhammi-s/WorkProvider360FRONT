import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { AuthShell } from '../auth-shell/auth-shell';

/**
 * Completes a password reset. `email` and `token` normally arrive as query
 * params from the emailed link; both remain editable as a fallback.
 */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthShell, Alert],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
      token: [this.route.snapshot.queryParamMap.get('token') ?? '', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchPasswords },
  );

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.resetPassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { reset: '1' } });
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not reset the password.');
        this.loading.set(false);
      },
    });
  }
}

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}
