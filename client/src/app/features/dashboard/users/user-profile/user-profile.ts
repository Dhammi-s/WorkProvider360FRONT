/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { SchedulerService } from '../../../../core/services/scheduler.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { UserDto } from '../../../../core/models/user.model';
import { UserProfile as UserProfileDetails } from '../../../../core/models/user-profile.model';
import { Schedule } from '../../../../core/models/scheduler.model';
import { Alert } from '../../../../shared/ui/alert/alert';
import { VisitCalendar } from '../../../../shared/ui/visit-calendar/visit-calendar';
import { ScheduleEditor } from '../../../../shared/ui/schedule-editor/schedule-editor';

type Section = 'main' | 'schedule';

/** Full-page user (caregiver/admin/manager) profile: Main details + a Schedule calendar with inline shift creation. */
@Component({
  selector: 'app-user-profile',
  imports: [RouterLink, ReactiveFormsModule, Alert, VisitCalendar, ScheduleEditor],
  templateUrl: './user-profile.html',
})
export class UserProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UserService);
  private readonly scheduler = inject(SchedulerService);
  private readonly auth = inject(AuthService);
  private readonly userProfileSvc = inject(UserProfileService);

  readonly userId = Number(this.route.snapshot.paramMap.get('id'));
  readonly canManage = computed(() => {
    const r = this.auth.roleName();
    return r === 'SuperAdmin' || r === 'Admin' || r === 'Manager';
  });

  readonly user = signal<UserDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly section = signal<Section>('main');

  readonly shifts = signal<Schedule[]>([]);
  readonly editorOpen = signal(false);
  readonly editorStart = signal<Date | null>(null);

  // ---- Edit profile drawer ----
  readonly profileDetails = signal<UserProfileDetails | null>(null);
  readonly drawerOpen = signal(false);
  readonly drawerSaving = signal(false);
  readonly drawerError = signal('');
  readonly drawerSuccess = signal('');

  readonly editForm = this.fb.nonNullable.group({
    dateOfBirth:           [''],
    gender:                [''],
    about:                 [''],
    addressLine1:          [''],
    addressLine2:          [''],
    city:                  [''],
    state:                 [''],
    postalCode:            [''],
    country:               [''],
    qualifications:        [''],
    yearsOfExperience:     [0],
    hasDrivingLicense:     [false],
    hasVehicle:            [false],
    emergencyContactName:  [''],
    emergencyContactPhone: [''],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.users.getById(this.userId).subscribe({
      next: (u) => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load user.');
        this.loading.set(false);
      },
    });
    this.loadShifts();
  }

  loadShifts(): void {
    this.scheduler.list(undefined, undefined, this.userId).subscribe({
      next: (s) => this.shifts.set(s),
      error: () => this.shifts.set([]),
    });
  }

  setSection(s: Section): void {
    this.section.set(s);
  }

  openEditor(date?: Date): void {
    this.editorStart.set(date ?? new Date());
    this.editorOpen.set(true);
  }

  onSaved(): void {
    this.editorOpen.set(false);
    this.loadShifts();
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  // ---- Edit profile drawer ----

  openDrawer(): void {
    this.drawerError.set('');
    this.drawerSuccess.set('');
    this.drawerOpen.set(true);
    if (!this.profileDetails()) {
      this.userProfileSvc.get(this.userId).subscribe({
        next: (p) => { this.profileDetails.set(p); this.patchEdit(p); },
        error: () => {},
      });
    } else {
      this.patchEdit(this.profileDetails()!);
    }
  }

  private patchEdit(p: UserProfileDetails): void {
    this.editForm.patchValue({
      dateOfBirth:           p.dateOfBirth ?? '',
      gender:                p.gender ?? '',
      about:                 p.about ?? '',
      addressLine1:          p.addressLine1 ?? '',
      addressLine2:          p.addressLine2 ?? '',
      city:                  p.city ?? '',
      state:                 p.state ?? '',
      postalCode:            p.postalCode ?? '',
      country:               p.country ?? '',
      qualifications:        p.qualifications ?? '',
      yearsOfExperience:     p.yearsOfExperience ?? 0,
      hasDrivingLicense:     p.hasDrivingLicense,
      hasVehicle:            p.hasVehicle,
      emergencyContactName:  p.emergencyContactName ?? '',
      emergencyContactPhone: p.emergencyContactPhone ?? '',
    });
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  saveProfile(): void {
    const v = this.editForm.getRawValue();
    this.drawerSaving.set(true);
    this.drawerError.set('');
    const clean = (s: string): string | null => s.trim() || null;

    this.userProfileSvc.update(this.userId, {
      dateOfBirth:            clean(v.dateOfBirth),
      gender:                 clean(v.gender),
      about:                  clean(v.about),
      addressLine1:           clean(v.addressLine1),
      addressLine2:           clean(v.addressLine2),
      city:                   clean(v.city),
      state:                  clean(v.state),
      postalCode:             clean(v.postalCode),
      country:                clean(v.country),
      qualifications:         clean(v.qualifications),
      yearsOfExperience:      v.yearsOfExperience > 0 ? v.yearsOfExperience : null,
      hasDrivingLicense:      v.hasDrivingLicense,
      hasVehicle:             v.hasVehicle,
      emergencyContactName:   clean(v.emergencyContactName),
      emergencyContactPhone:  clean(v.emergencyContactPhone),
      hireDate:               this.profileDetails()?.hireDate ?? null,
      serviceTypeIds:         this.profileDetails()?.skills.map((s) => s.serviceTypeId) ?? [],
      availability:           this.profileDetails()?.availability ?? [],
    }).subscribe({
      next: (p) => {
        this.profileDetails.set(p);
        this.drawerSaving.set(false);
        this.drawerSuccess.set('Profile updated successfully.');
        setTimeout(() => { this.drawerSuccess.set(''); this.drawerOpen.set(false); }, 1400);
      },
      error: (err: Error) => {
        this.drawerError.set(err.message || 'Could not save the profile.');
        this.drawerSaving.set(false);
      },
    });
  }
}
