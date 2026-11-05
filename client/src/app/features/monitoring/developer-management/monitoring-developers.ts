/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { MonitoringAuthService } from '../auth/monitoring-auth.service';
import {
  MonitoringPermissionInfo,
  MonitoringRoleInfo,
  MonitoringUser,
  ResetTokenResult,
} from '../models/monitoring.models';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringUsersService } from '../services/monitoring-users.service';
import { fmtDateTime } from '../shared/format';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonPager } from '../shared/mon-pager';
import { MonState } from '../shared/mon-state';

type Tab = 'users' | 'roles';

/** SuperAdmin: manage monitoring users, their roles, sessions, and role permissions. */
@Component({
  selector: 'app-monitoring-developers',
  imports: [FormsModule, MonPageHeader, MonPager, MonState],
  template: `
    <mon-page-header title="Developer Management" subtitle="Monitoring accounts, roles and permissions">
      @if (tab() === 'users') {
        <button type="button" class="mon-btn-primary" (click)="openCreate()">+ New developer</button>
      }
    </mon-page-header>

    <div class="inline-flex rounded-xl bg-slate-100 p-1">
      <button type="button" class="mon-tab" [class.mon-tab-active]="tab() === 'users'" (click)="tab.set('users')">Users</button>
      <button type="button" class="mon-tab" [class.mon-tab-active]="tab() === 'roles'" (click)="openRoles()">Roles &amp; permissions</button>
    </div>

    @if (notice()) { <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{{ notice() }}</p> }
    @if (actionError()) { <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ actionError() }}</p> }

    @if (tab() === 'users') {
      <div class="mt-4 flex gap-3">
        <input class="mon-field w-72" placeholder="Search name or email…" [(ngModel)]="search" (keyup.enter)="apply()" />
        <button type="button" class="mon-btn-primary" (click)="apply()">Search</button>
      </div>
      <div class="mt-4">
        <mon-state [loading]="loading()" [error]="error()" [empty]="users().length === 0" emptyTitle="No users found" emptyHint="" (retry)="load()">
          <div class="mon-card overflow-x-auto">
            <table class="mon-table">
              <thead><tr><th class="mon-th">User</th><th class="mon-th">Roles</th><th class="mon-th">Status</th><th class="mon-th">Last login</th><th class="mon-th text-right">Actions</th></tr></thead>
              <tbody>
                @for (u of users(); track u.monitoringUserId) {
                  <tr class="mon-row">
                    <td class="mon-td"><div class="font-semibold text-slate-800">{{ u.fullName }}</div><div class="text-xs text-slate-500">{{ u.email }}</div></td>
                    <td class="mon-td">
                      @for (r of u.roles; track r) { <span class="mon-badge mr-1 bg-brand-50 text-brand-700">{{ r }}</span> } @empty { <span class="text-slate-400">–</span> }
                    </td>
                    <td class="mon-td">
                      <span class="mon-badge" [class]="u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">{{ u.isActive ? 'Active' : 'Inactive' }}</span>
                      @if (u.isLocked) { <span class="mon-badge ml-1 bg-red-50 text-red-700">Locked</span> }
                      @if (u.mustChangePassword) { <span class="mon-badge ml-1 bg-amber-50 text-amber-700">Must change pw</span> }
                    </td>
                    <td class="mon-td whitespace-nowrap text-xs">{{ dt(u.lastLoginDate) }}</td>
                    <td class="mon-td">
                      <div class="flex flex-wrap justify-end gap-1.5">
                        <button type="button" class="mon-btn-ghost !px-2.5 !py-1 text-xs" (click)="openEditRoles(u)">Roles</button>
                        @if (u.isActive) {
                          <button type="button" class="mon-btn-ghost !px-2.5 !py-1 text-xs" (click)="run(u, 'deactivate', 'Deactivate ' + u.email + '?')">Deactivate</button>
                        } @else {
                          <button type="button" class="mon-btn-ghost !px-2.5 !py-1 text-xs" (click)="run(u, 'activate')">Activate</button>
                        }
                        @if (u.isLocked) { <button type="button" class="mon-btn-ghost !px-2.5 !py-1 text-xs" (click)="run(u, 'unlock')">Unlock</button> }
                        <button type="button" class="mon-btn-ghost !px-2.5 !py-1 text-xs" (click)="run(u, 'revoke', 'Sign ' + u.email + ' out of all sessions?')">Revoke sessions</button>
                        <button type="button" class="mon-btn-ghost !px-2.5 !py-1 text-xs" (click)="issueToken(u)">Reset token</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <mon-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
          </div>
        </mon-state>
      </div>
    } @else {
      <div class="mt-4">
        <mon-state [loading]="rolesLoading()" [error]="rolesError()" [empty]="roles().length === 0" emptyTitle="No roles" emptyHint="" (retry)="openRoles()">
          @if (!canManageRoles) {
            <p class="mb-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">Read-only: changing role permissions requires the roles.manage permission.</p>
          }
          <div class="mon-card overflow-x-auto">
            <table class="mon-table">
              <thead>
                <tr>
                  <th class="mon-th">Permission</th>
                  @for (r of roles(); track r.roleId) { <th class="mon-th text-center">{{ r.roleName }}</th> }
                </tr>
              </thead>
              <tbody>
                @for (p of permissions(); track p.permissionId) {
                  <tr class="mon-row">
                    <td class="mon-td"><div class="font-mono text-xs font-semibold">{{ p.permissionName }}</div>@if (p.description) { <div class="text-xs text-slate-400">{{ p.description }}</div> }</td>
                    @for (r of roles(); track r.roleId) {
                      <td class="mon-td text-center">
                        <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" [checked]="has(r, p.permissionName)" [disabled]="!canManageRoles || r.roleName === 'SuperAdmin'" (change)="togglePerm(r, p.permissionName)" [attr.aria-label]="r.roleName + ' ' + p.permissionName" />
                      </td>
                    }
                  </tr>
                }
                @if (canManageRoles) {
                  <tr class="border-t border-slate-100">
                    <td class="mon-td"></td>
                    @for (r of roles(); track r.roleId) {
                      <td class="mon-td text-center">
                        @if (r.roleName !== 'SuperAdmin') {
                          <button type="button" class="mon-btn-primary !px-3 !py-1 text-xs" [disabled]="!isRoleDirty(r.roleId)" (click)="saveRole(r)">Save</button>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </mon-state>
      </div>
    }

    <!-- Create user -->
    @if (createOpen()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" (click)="createOpen.set(false)">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" (click)="$event.stopPropagation()" role="dialog" aria-label="New developer">
          <h2 class="text-lg font-extrabold text-slate-900">New developer</h2>
          <p class="mt-1 text-sm text-slate-500">They must change this temporary password at first sign-in.</p>
          @if (createError()) { <p class="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ createError() }}</p> }
          <div class="mt-4 space-y-3">
            <div><label class="wp-label">Full name</label><input class="wp-input" [(ngModel)]="newName" /></div>
            <div><label class="wp-label">Email</label><input type="email" class="wp-input" [(ngModel)]="newEmail" /></div>
            <div><label class="wp-label">Temporary password</label><input type="password" class="wp-input" autocomplete="new-password" [(ngModel)]="newPassword" /></div>
            <div>
              <label class="wp-label">Roles</label>
              <div class="flex flex-wrap gap-2">
                @for (r of allRoleNames(); track r) {
                  <label class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                    <input type="checkbox" [checked]="newRoles().includes(r)" (change)="toggleNewRole(r)" /> {{ r }}
                  </label>
                }
              </div>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="mon-btn-ghost" (click)="createOpen.set(false)">Cancel</button>
            <button type="button" class="mon-btn-primary" [disabled]="creating()" (click)="create()">{{ creating() ? 'Creating…' : 'Create' }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Edit roles -->
    @if (editUser(); as eu) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" (click)="editUser.set(null)">
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" (click)="$event.stopPropagation()" role="dialog" aria-label="Edit roles">
          <h2 class="text-lg font-extrabold text-slate-900">Roles for {{ eu.fullName }}</h2>
          <div class="mt-4 space-y-2">
            @for (r of allRoleNames(); track r) {
              <label class="flex items-center gap-2 text-sm"><input type="checkbox" [checked]="editRoles().includes(r)" (change)="toggleEditRole(r)" /> {{ r }}</label>
            }
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="mon-btn-ghost" (click)="editUser.set(null)">Cancel</button>
            <button type="button" class="mon-btn-primary" (click)="saveEditRoles(eu)">Save roles</button>
          </div>
        </div>
      </div>
    }

    <!-- One-time reset token -->
    @if (token(); as t) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-label="Reset token">
          <h2 class="text-lg font-extrabold text-slate-900">Password reset token</h2>
          <p class="mt-1 text-sm text-amber-700">This token is shown only once. Share it securely with {{ tokenFor() }}; it expires {{ dt(t.expiresAt) }}.</p>
          <div class="mt-4 break-all rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-100">{{ t.token }}</div>
          <p class="mt-2 text-xs text-slate-400">They redeem it at /monitoring/reset-password with their email.</p>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="mon-btn-ghost" (click)="copy(t.token)">{{ copied() ? 'Copied' : 'Copy token' }}</button>
            <button type="button" class="mon-btn-primary" (click)="closeToken()">Done</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class MonitoringDevelopers {
  private readonly api = inject(MonitoringUsersService);
  private readonly auth = inject(MonitoringAuthService);

  readonly canManageRoles = this.auth.hasPermission('roles.manage');
  readonly pageSize = 25;
  readonly tab = signal<Tab>('users');
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly users = signal<MonitoringUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  search = '';
  readonly notice = signal('');
  readonly actionError = signal('');

  readonly roles = signal<MonitoringRoleInfo[]>([]);
  readonly permissions = signal<MonitoringPermissionInfo[]>([]);
  readonly rolesLoading = signal(false);
  readonly rolesError = signal<MonitoringApiError | null>(null);
  private readonly roleDrafts = signal<Record<number, string[]>>({});

  readonly allRoleNames = computed(() => (this.roles().length ? this.roles().map((r) => r.roleName) : FALLBACK_ROLES));

  readonly createOpen = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  newName = '';
  newEmail = '';
  newPassword = '';
  readonly newRoles = signal<string[]>(['ReadOnly']);

  readonly editUser = signal<MonitoringUser | null>(null);
  readonly editRoles = signal<string[]>([]);

  readonly token = signal<ResetTokenResult | null>(null);
  readonly tokenFor = signal('');
  readonly copied = signal(false);
  readonly dt = fmtDateTime;

  constructor() {
    this.load();
    this.loadRoles();
  }

  apply(): void {
    this.page.set(1);
    this.load();
  }

  goPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ search: this.search.trim(), page: this.page(), pageSize: this.pageSize }).subscribe({
      next: (r) => {
        this.users.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: (e: MonitoringApiError) => {
        this.error.set(e);
        this.loading.set(false);
      },
    });
  }

  private loadRoles(): void {
    this.rolesLoading.set(true);
    this.rolesError.set(null);
    this.api.roles().subscribe({
      next: (r) => {
        this.roles.set(r);
        this.roleDrafts.set({});
        this.rolesLoading.set(false);
      },
      error: (e: MonitoringApiError) => {
        this.rolesError.set(e);
        this.rolesLoading.set(false);
      },
    });
    this.api.permissions().subscribe({ next: (p) => this.permissions.set(p), error: () => {} });
  }

  openRoles(): void {
    this.tab.set('roles');
    this.loadRoles();
  }

  // --- user actions ---------------------------------------------------------
  run(u: MonitoringUser, action: 'activate' | 'deactivate' | 'unlock' | 'revoke', confirmText?: string): void {
    if (confirmText && !window.confirm(confirmText)) return;
    const calls: Record<string, Observable<unknown>> = {
      activate: this.api.activate(u.monitoringUserId),
      deactivate: this.api.deactivate(u.monitoringUserId),
      unlock: this.api.unlock(u.monitoringUserId),
      revoke: this.api.revokeSessions(u.monitoringUserId),
    };
    this.flash('', '');
    calls[action].subscribe({
      next: () => {
        this.flash(`Done: ${action} ${u.email}.`, '');
        this.load();
      },
      error: (e: MonitoringApiError) => this.flash('', e.message),
    });
  }

  issueToken(u: MonitoringUser): void {
    if (!window.confirm(`Generate a one-time password reset token for ${u.email}?`)) return;
    this.flash('', '');
    this.api.resetToken(u.monitoringUserId).subscribe({
      next: (t) => {
        this.tokenFor.set(u.email);
        this.copied.set(false);
        this.token.set(t);
      },
      error: (e: MonitoringApiError) => this.flash('', e.message),
    });
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text).then(() => this.copied.set(true), () => {});
  }

  closeToken(): void {
    this.token.set(null);
    this.copied.set(false);
  }

  // --- create ---------------------------------------------------------------
  openCreate(): void {
    this.newName = '';
    this.newEmail = '';
    this.newPassword = '';
    this.newRoles.set(['ReadOnly']);
    this.createError.set('');
    this.createOpen.set(true);
  }

  toggleNewRole(r: string): void {
    this.newRoles.update((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));
  }

  create(): void {
    if (!this.newName.trim() || !this.newEmail.trim() || !this.newPassword) {
      this.createError.set('Name, email and temporary password are required.');
      return;
    }
    this.creating.set(true);
    this.createError.set('');
    this.api
      .create({ fullName: this.newName.trim(), email: this.newEmail.trim(), temporaryPassword: this.newPassword, roles: this.newRoles() })
      .subscribe({
        next: (u) => {
          this.creating.set(false);
          this.createOpen.set(false);
          this.newPassword = '';
          this.flash(`Created ${u.email}. They must change the password at first sign-in.`, '');
          this.load();
        },
        error: (e: MonitoringApiError) => {
          this.creating.set(false);
          this.createError.set(e.message);
        },
      });
  }

  // --- user roles -----------------------------------------------------------
  openEditRoles(u: MonitoringUser): void {
    this.editRoles.set([...u.roles]);
    this.editUser.set(u);
  }

  toggleEditRole(r: string): void {
    this.editRoles.update((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));
  }

  saveEditRoles(u: MonitoringUser): void {
    this.api.setRoles(u.monitoringUserId, this.editRoles()).subscribe({
      next: () => {
        this.editUser.set(null);
        this.flash(`Roles updated for ${u.email}.`, '');
        this.load();
      },
      error: (e: MonitoringApiError) => {
        this.editUser.set(null);
        this.flash('', e.message);
      },
    });
  }

  // --- role permissions -----------------------------------------------------
  has(role: MonitoringRoleInfo, perm: string): boolean {
    return (this.roleDrafts()[role.roleId] ?? role.permissions).includes(perm);
  }

  isRoleDirty(roleId: number): boolean {
    return roleId in this.roleDrafts();
  }

  togglePerm(role: MonitoringRoleInfo, perm: string): void {
    const current = this.roleDrafts()[role.roleId] ?? role.permissions;
    const next = current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm];
    this.roleDrafts.update((d) => ({ ...d, [role.roleId]: next }));
  }

  saveRole(role: MonitoringRoleInfo): void {
    const perms = this.roleDrafts()[role.roleId];
    if (!perms) return;
    this.api.setRolePermissions(role.roleId, perms).subscribe({
      next: () => {
        this.flash(`Permissions saved for ${role.roleName}.`, '');
        this.loadRoles();
      },
      error: (e: MonitoringApiError) => this.flash('', e.message),
    });
  }

  private flash(notice: string, error: string): void {
    this.notice.set(notice);
    this.actionError.set(error);
  }
}

const FALLBACK_ROLES = ['SuperAdmin', 'Developer', 'DevOps', 'SupportEngineer', 'ReadOnly'];
