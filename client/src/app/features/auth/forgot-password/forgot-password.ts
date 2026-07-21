import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { AuthShell } from '../auth-shell/auth-shell';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthShell, Alert],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly done = signal(false);
  readonly message = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.forgotPassword(this.form.getRawValue()).subscribe({
      next: (msg) => {
        this.message.set(msg);
        this.done.set(true);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not process the request.');
        this.loading.set(false);
      },
    });
  }
}
