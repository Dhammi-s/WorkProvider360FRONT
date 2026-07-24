import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [ReactiveFormsModule, FormsModule, DatePipe, Alert],
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

  // Bulk selection state
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly bulkBusy = signal(false);
  readonly confirmBulk = signal(false);
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allVisibleSelected = computed(() => {
    const rows = this.filteredUsers();
    const sel = this.selectedIds();
    return rows.length > 0 && rows.every((u) => sel.has(u.userId));
  });

  readonly total = computed(() => this.users().length);

  // Office filter ('' = all, 'none' = no office assigned, else an officeId)
  readonly officeFilter = signal<string>('');
  readonly roleFilter = signal<string>('');

  readonly filteredUsers = computed(() => {
    const office = this.officeFilter();
    const role = this.roleFilter();
    return this.users().filter((u) => {
      const officeOk =
        !office ||
        (office === 'none' ? !u.officeId : u.officeId === office);
      const roleOk = !role || u.roleName === role;
      return officeOk && roleOk;
    });
  });

  readonly roleNames = ['SuperAdmin', 'Admin', 'Manager', 'User'];

  // Send-SMS modal state
  readonly smsUser = signal<UserDto | null>(null);
  readonly smsNumber = signal('');
  readonly smsMessage = signal('');
  readonly smsSending = signal(false);
  readonly smsError = signal('');
  readonly smsNotice = signal('');

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    roleId: [4, [Validators.required]],
    phone: [''],
    officeId: [''],
  });

  constructor() {
    this.loadUsers();
    this.userService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles.filter((r) => r.isActive)),
      error: () => this.roles.set([]),
    });
    // Load offices for the filter + (SuperAdmin) the create-user office picker.
    // For an Admin this returns just their own office.
    this.officeService.list().subscribe({
      next: (o) => this.offices.set(o.filter((x) => x.isActive)),
      error: () => this.offices.set([]),
    });
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
    this.form.reset({ fullName: '', email: '', password: '', roleId: 4, phone: '', officeId: '' });
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
        phone: value.phone?.trim() || null,
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

  isSelected(userId: number): boolean {
    return this.selectedIds().has(userId);
  }

  toggleSelect(userId: number): void {
    const next = new Set(this.selectedIds());
    next.has(userId) ? next.delete(userId) : next.add(userId);
    this.selectedIds.set(next);
  }

  toggleSelectAll(): void {
    const rows = this.filteredUsers();
    if (this.allVisibleSelected()) {
      const next = new Set(this.selectedIds());
      rows.forEach((u) => next.delete(u.userId));
      this.selectedIds.set(next);
    } else {
      const next = new Set(this.selectedIds());
      rows.forEach((u) => next.add(u.userId));
      this.selectedIds.set(next);
    }
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
    this.confirmBulk.set(false);
  }

  bulkResend(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkBusy.set(true);
    this.resendNotice.set('');
    this.resendError.set('');
    this.userService.resendCredentialsBulk(ids).subscribe({
      next: (msg) => {
        this.bulkBusy.set(false);
        this.confirmBulk.set(false);
        this.resendNotice.set(msg);
        this.clearSelection();
      },
      error: (err: Error) => {
        this.bulkBusy.set(false);
        this.confirmBulk.set(false);
        this.resendError.set(err.message || 'Could not send credentials.');
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

  // ---- Send SMS ----
  openSms(user: UserDto): void {
    this.smsUser.set(user);
    this.smsNumber.set(user.phone ?? '');
    this.smsMessage.set('');
    this.smsError.set('');
    this.smsNotice.set('');
    this.smsSending.set(false);
  }

  closeSms(): void {
    this.smsUser.set(null);
  }

  sendSms(): void {
    const user = this.smsUser();
    const number = this.smsNumber().trim();
    const message = this.smsMessage().trim();
    if (!message) {
      this.smsError.set('Enter a message to send.');
      return;
    }
    if (!number) {
      this.smsError.set('Enter a phone number.');
      return;
    }
    this.smsSending.set(true);
    this.smsError.set('');
    this.userService
      .sendSms({ userId: user?.userId ?? null, toNumber: number, message })
      .subscribe({
        next: (msg) => {
          this.smsSending.set(false);
          this.smsNotice.set(msg);
          this.smsUser.set(null);
        },
        error: (err: Error) => {
          this.smsSending.set(false);
          this.smsError.set(err.message || 'Could not send the SMS.');
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
