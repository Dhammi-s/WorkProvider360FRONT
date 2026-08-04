/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Office } from '../../../core/models/office.model';
import { RoleDto } from '../../../core/models/role.model';
import { UserDto } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { OfficeService } from '../../../core/services/office.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserService } from '../../../core/services/user.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { Paginator } from '../../../shared/ui/paginator/paginator';

/** Admin team management: list tenant users and create new ones. */
@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule, FormsModule, DatePipe, Alert, Paginator],
  templateUrl: './users.html',
})
export class Users {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly officeService = inject(OfficeService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');
  /** SuperAdmin + Admin can create/resend/notify; Managers get a view-only list (for unlocking). */
  readonly canManageTeam = computed(() => {
    const r = this.auth.roleName();
    return r === 'SuperAdmin' || r === 'Admin';
  });

  // Lower rank number = higher authority (SuperAdmin=1 … User=4).
  private readonly rankByRole: Record<string, number> = { SuperAdmin: 1, Admin: 2, Manager: 3, User: 4 };
  private readonly myRank = computed(() => this.rankByRole[this.auth.roleName() ?? 'User'] ?? 4);

  /** Whether Admins/Managers may unlock accounts in this tenant (SuperAdmin always can). */
  readonly allowStaffUnlock = signal(false);

  // Unlock action state
  readonly unlockBusyId = signal<number | null>(null);
  readonly unlockNotice = signal('');
  readonly unlockError = signal('');

  /** Show the Unlock action only for locked accounts the current user is allowed to unlock. */
  canUnlock(user: UserDto): boolean {
    if (!user.isLockedOut) return false;
    if (this.isSuperAdmin()) return true;
    // Admin/Manager: needs the tenant flag AND a strictly-lower-rank target.
    const targetRank = this.rankByRole[user.roleName] ?? 4;
    return this.allowStaffUnlock() && targetRank > this.myRank();
  }

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
    const rows = this.users();
    const sel = this.selectedIds();
    return rows.length > 0 && rows.every((u) => sel.has(u.userId));
  });

  readonly total = signal(0);

  // Office filter ('' = all, 'none' = no office assigned, else an officeId)
  readonly officeFilter = signal<string>('');
  readonly roleFilter = signal<string>('');

  readonly roleNames = ['SuperAdmin', 'Admin', 'Manager', 'User'];

  // Server-side pagination.
  readonly page = signal(1);
  readonly pageSize = signal(10);

  goPage(p: number): void {
    this.page.set(p);
    this.loadUsers();
  }

  setPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(1);
    this.loadUsers();
  }

  setOfficeFilter(v: string): void {
    this.officeFilter.set(v);
    this.page.set(1);
    this.loadUsers();
  }

  setRoleFilter(v: string): void {
    this.roleFilter.set(v);
    this.page.set(1);
    this.loadUsers();
  }

  clearFilters(): void {
    this.officeFilter.set('');
    this.roleFilter.set('');
    this.page.set(1);
    this.loadUsers();
  }

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
    // Non-SuperAdmins need the tenant policy to know if they can unlock.
    this.userService.getAllowStaffUnlock().subscribe({
      next: (allow) => this.allowStaffUnlock.set(allow),
      error: () => this.allowStaffUnlock.set(false),
    });
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
    const office = this.officeFilter();
    const filters = {
      role: this.roleFilter() || undefined,
      officeId: office && office !== 'none' ? office : undefined,
      noOffice: office === 'none',
    };
    this.userService.getUsersPaged(this.page(), this.pageSize(), filters).subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.total.set(res.total);
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
    const rows = this.users();
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

  // ---- Unlock a locked account ----
  doUnlock(userId: number): void {
    this.unlockBusyId.set(userId);
    this.unlockNotice.set('');
    this.unlockError.set('');
    this.userService.unlock(userId).subscribe({
      next: (msg) => {
        this.unlockBusyId.set(null);
        this.unlockNotice.set(msg);
        this.loadUsers();
      },
      error: (err: Error) => {
        this.unlockBusyId.set(null);
        this.unlockError.set(err.message || 'Could not unlock the account.');
      },
    });
  }

  // ---- Send in-app notification (the "Text" action) ----
  openSms(user: UserDto): void {
    this.smsUser.set(user);
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
    const message = this.smsMessage().trim();
    if (!user) return;
    if (!message) {
      this.smsError.set('Enter a message to send.');
      return;
    }
    this.smsSending.set(true);
    this.smsError.set('');
    this.notifications.send(user.userId, message).subscribe({
      next: (msg) => {
        this.smsSending.set(false);
        this.smsNotice.set(msg);
        this.smsUser.set(null);
      },
      error: (err: Error) => {
        this.smsSending.set(false);
        this.smsError.set(err.message || 'Could not send the notification.');
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
