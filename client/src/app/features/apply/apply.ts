/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicFormConfig, Question } from '../../core/models/application.model';
import { AvailabilitySlot } from '../../core/models/user-profile.model';
import { ServiceType } from '../../core/models/service-type.model';
import { ApplicationService } from '../../core/services/application.service';
import { Alert } from '../../shared/ui/alert/alert';
import { AuthShell } from '../auth/auth-shell/auth-shell';
import { AvailabilityEditor } from '../../shared/ui/availability-editor/availability-editor';

/**
 * Anonymous application form for Admin/Manager access. Role dropdown and custom
 * questions are loaded from the backend; mandatory fields follow the tenant's
 * settings.
 */
@Component({
  selector: 'app-apply',
  imports: [ReactiveFormsModule, RouterLink, AuthShell, Alert, AvailabilityEditor],
  templateUrl: './apply.html',
})
export class Apply {
  private readonly fb = inject(FormBuilder);
  private readonly applications = inject(ApplicationService);

  readonly loadingConfig = signal(true);
  readonly loadError = signal('');
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly submitted = signal(false);

  readonly config = signal<PublicFormConfig | null>(null);
  readonly questions = computed(() => this.config()?.questions ?? []);
  readonly serviceTypes = computed<ServiceType[]>(() => this.config()?.serviceTypes ?? []);

  form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: [''],
    requestedRoleId: [null as number | null, [Validators.required]],
    desiredSalary: [null as number | null, [Validators.min(0)]],
    city: [''],
    state: [''],
    postalCode: [''],
    dateOfBirth: [''],
    gender: [''],
    qualifications: [''],
    yearsOfExperience: [null as number | null, [Validators.min(0), Validators.max(60)]],
    about: ['', [Validators.maxLength(2000)]],
    hasDrivingLicense: [false],
    hasVehicle: [false],
    serviceTypeIds: new FormControl<number[]>([], { nonNullable: true }),
    availability: new FormControl<AvailabilitySlot[]>([], { nonNullable: true }),
    answers: this.fb.group({}),
  });

  constructor() {
    this.applications.getFormConfig().subscribe({
      next: (config) => {
        this.config.set(config);
        this.applyConfig(config);
        this.loadingConfig.set(false);
      },
      error: (err: Error) => {
        this.loadError.set(err.message || 'Could not load the application form.');
        this.loadingConfig.set(false);
      },
    });
  }

  get answersGroup(): FormGroup {
    return this.form.get('answers') as FormGroup;
  }

  answerControlName(q: Question): string {
    return `q${q.questionId}`;
  }

  private applyConfig(config: PublicFormConfig): void {
    if (config.requirePhone) {
      this.form.get('phone')?.addValidators(Validators.required);
    }
    if (config.requireAddress) {
      this.form.get('address')?.addValidators(Validators.required);
    }
    if (config.requireDateOfBirth) this.form.get('dateOfBirth')?.addValidators(Validators.required);
    if (config.requireQualifications) this.form.get('qualifications')?.addValidators(Validators.required);
    if (config.requireSkills) this.form.get('serviceTypeIds')?.addValidators(Validators.required);
    if (config.requireAvailability) this.form.get('availability')?.addValidators(Validators.required);
    this.form.get('phone')?.updateValueAndValidity();
    this.form.get('address')?.updateValueAndValidity();
    this.form.get('dateOfBirth')?.updateValueAndValidity();
    this.form.get('qualifications')?.updateValueAndValidity();
    this.form.get('serviceTypeIds')?.updateValueAndValidity();
    this.form.get('availability')?.updateValueAndValidity();

    for (const q of config.questions) {
      const validators = q.isRequired ? [Validators.required] : [];
      this.answersGroup.addControl(this.answerControlName(q), new FormControl('', validators));
    }
  }

  toggleSkill(id: number): void {
    const control = this.form.get('serviceTypeIds');
    const current = (control?.value as number[]) ?? [];
    control?.setValue(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
    control?.markAsTouched();
  }

  hasSkill(id: number): boolean {
    return ((this.form.get('serviceTypeIds')?.value as number[]) ?? []).includes(id);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();
    const answers = this.questions().map((q) => ({
      questionId: q.questionId,
      answerText: (raw.answers[this.answerControlName(q)] as string) || null,
    }));

    this.applications
      .submit({
        fullName: raw.fullName,
        email: raw.email,
        phone: raw.phone || null,
        address: raw.address || null,
        requestedRoleId: Number(raw.requestedRoleId),
        desiredSalary: raw.desiredSalary != null && raw.desiredSalary !== '' ? Number(raw.desiredSalary) : null,
        city: raw.city || null,
        state: raw.state || null,
        postalCode: raw.postalCode || null,
        dateOfBirth: raw.dateOfBirth || null,
        gender: raw.gender || null,
        qualifications: raw.qualifications || null,
        yearsOfExperience: raw.yearsOfExperience != null && raw.yearsOfExperience !== '' ? Number(raw.yearsOfExperience) : null,
        about: raw.about || null,
        hasDrivingLicense: !!raw.hasDrivingLicense,
        hasVehicle: !!raw.hasVehicle,
        serviceTypeIds: raw.serviceTypeIds ?? [],
        availability: raw.availability ?? [],
        answers,
      })
      .subscribe({
        next: () => {
          this.submitted.set(true);
          this.submitting.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not submit your application.');
          this.submitting.set(false);
        },
      });
  }
}
