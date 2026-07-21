import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { AuthShell } from '../auth-shell/auth-shell';

/**
 * Register = bootstrap the first SuperAdmin for a freshly provisioned tenant.
 * Only succeeds while the tenant has no users (the backend self-disables it
 * afterwards), so an "already initialized" error is expected on repeat use.
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthShell, Alert],
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
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

    const { fullName, email, password } = this.form.getRawValue();
    this.auth.bootstrapAdmin({ fullName, email, password }).subscribe({
      next: () => {
        this.router.navigate(['/login'], {
          queryParams: { registered: '1' },
        });
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not create the administrator account.');
        this.loading.set(false);
      },
    });
  }
}

/** Cross-field validator: password === confirmPassword. */
function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}
