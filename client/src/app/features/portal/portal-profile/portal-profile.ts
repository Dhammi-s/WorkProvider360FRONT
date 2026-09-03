/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PortalService } from '../../../core/services/portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { PortalProfile as PortalProfileDto } from '../../../core/models/portal.model';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-portal-profile',
  imports: [ReactiveFormsModule, Alert],
  templateUrl: './portal-profile.html',
})
export class PortalProfile {
  private readonly fb = inject(FormBuilder);
  private readonly portal = inject(PortalService);
  private readonly auth = inject(AuthService);

  readonly profile = signal<PortalProfileDto | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  readonly pwSaving = signal(false);
  readonly pwNotice = signal('');
  readonly pwError = signal('');

  readonly form = this.fb.nonNullable.group({
    phone: [''],
    alternatePhone: [''],
    accessInstructions: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    emergencyContactRelation: [''],
    preferredLanguage: [''],
  });

  readonly pwForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.portal.me().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.form.patchValue({
          phone: p.phone ?? '',
          alternatePhone: p.alternatePhone ?? '',
          accessInstructions: p.accessInstructions ?? '',
          emergencyContactName: p.emergencyContactName ?? '',
          emergencyContactPhone: p.emergencyContactPhone ?? '',
          emergencyContactRelation: p.emergencyContactRelation ?? '',
          preferredLanguage: p.preferredLanguage ?? '',
        });
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load your profile.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.notice.set('');
    this.error.set('');
    const v = this.form.getRawValue();
    const clean = (s: string) => (s.trim() ? s.trim() : null);
    this.portal
      .updateMe({
        phone: clean(v.phone),
        alternatePhone: clean(v.alternatePhone),
        accessInstructions: clean(v.accessInstructions),
        emergencyContactName: clean(v.emergencyContactName),
        emergencyContactPhone: clean(v.emergencyContactPhone),
        emergencyContactRelation: clean(v.emergencyContactRelation),
        preferredLanguage: clean(v.preferredLanguage),
      })
      .subscribe({
        next: (p) => {
          this.profile.set(p);
          this.notice.set('Profile saved.');
          this.saving.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not save your profile.');
          this.saving.set(false);
        },
      });
  }

  changePassword(): void {
    if (this.pwForm.invalid) {
      this.pwForm.markAllAsTouched();
      return;
    }
    this.pwSaving.set(true);
    this.pwNotice.set('');
    this.pwError.set('');
    const { currentPassword, newPassword } = this.pwForm.getRawValue();
    this.auth.changePassword({ currentPassword, newPassword, confirmPassword: newPassword }).subscribe({
      next: (msg) => {
        this.pwNotice.set(msg);
        this.pwSaving.set(false);
        this.pwForm.reset();
      },
      error: (err: Error) => {
        this.pwError.set(err.message || 'Could not change your password.');
        this.pwSaving.set(false);
      },
    });
  }
}
