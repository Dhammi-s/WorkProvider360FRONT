import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Office } from '../../../core/models/office.model';
import { RoleDto } from '../../../core/models/role.model';
import { UserDto } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { OfficeService } from '../../../core/services/office.service';
import { UserService } from '../../../core/services/user.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Admin team management: list tenant users and create new ones. */
@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule, DatePipe, Alert],
  templateUrl: './users.html',
})
export class Users {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly officeService = inject(OfficeService);
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');

  readonly users = signal<UserDto[]>([]);
  readonly roles = signal<RoleDto[]>([]);
  readonly offices = signal<Office[]>([]);
  readonly loading = signal(true);
  readonly listError = signal('');

  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly showPassword = signal(false);

  // Resend-credentials state
  readonly confirmResendId = signal<number | null>(null);
  readonly resendBusyId = signal<number | null>(null);
  readonly resendNotice = signal('');
  readonly resendError = signal('');

  readonly total = computed(() => this.users().length);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    roleId: [4, [Validators.required]],
    officeId: [''],
  });

  constructor() {
    this.loadUsers();
    this.userService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles.filter((r) => r.isActive)),
      error: () => this.roles.set([]),
    });
    // SuperAdmin can assign any office; Admins are locked to their own server-side.
    if (this.isSuperAdmin()) {
      this.officeService.list().subscribe({
        next: (o) => this.offices.set(o.filter((x) => x.isActive)),
        error: () => this.offices.set([]),
      });
    }
  }

  loadUsers(): void {
    this.loading.set(true);
    this.listError.set('');
    this.userService.getUsers().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.listError.set(err.message || 'Could not load users.');
        this.loading.set(false);
      },
    });
  }

  openModal(): void {
    this.form.reset({ fullName: '', email: '', password: '', roleId: 4, officeId: '' });
    this.formError.set('');
    this.showPassword.set(false);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const value = this.form.getRawValue();
    this.userService
      .createUser({
        fullName: value.fullName,
        email: value.email,
        password: value.password,
        roleId: Number(value.roleId),
        officeId: value.officeId || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.loadUsers();
        },
        error: (err: Error) => {
          this.formError.set(err.message || 'Could not create the user.');
          this.saving.set(false);
        },
      });
  }

  askResend(userId: number): void {
    this.resendNotice.set('');
    this.resendError.set('');
    this.confirmResendId.set(userId);
  }

  cancelResend(): void {
    this.confirmResendId.set(null);
  }

  doResend(userId: number): void {
    this.confirmResendId.set(null);
    this.resendBusyId.set(userId);
    this.resendNotice.set('');
    this.resendError.set('');
    this.userService.resendCredentials(userId).subscribe({
      next: (msg) => {
        this.resendBusyId.set(null);
        this.resendNotice.set(msg);
      },
      error: (err: Error) => {
        this.resendBusyId.set(null);
        this.resendError.set(err.message || 'Could not resend credentials.');
      },
    });
  }

  initials(name: string): string {
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join('') || 'U'
    );
  }

  roleBadge(roleName: string): string {
    switch (roleName) {
      case 'SuperAdmin':
        return 'bg-brand-50 text-brand-700';
      case 'Admin':
        return 'bg-indigo-50 text-indigo-700';
      case 'Manager':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }
}
