import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RoleName } from '../../../core/models/role.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { StatCard } from '../../../shared/ui/stat-card/stat-card';

interface Stat {
  label: string;
  value: string;
  delta?: string;
  icon: string;
  tone: 'brand' | 'accent' | 'amber' | 'slate';
}

/**
 * Role-aware landing page. Every role gets a tailored greeting, KPI row and
 * quick actions. Admin roles also see a live team count from the API; the
 * remaining KPIs are illustrative until metrics endpoints exist.
 */
@Component({
  selector: 'app-dashboard-home',
  imports: [StatCard, RouterLink],
  templateUrl: './home.html',
})
export class DashboardHome {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);

  readonly user = this.auth.user;
  private readonly teamCount = signal<number | null>(null);

  /** "SMS coming soon" toast — auto-hides after 10 seconds. */
  readonly smsToastVisible = signal(true);
  readonly smsNotice = 'SMS notifications are coming soon — our team is still working on this feature. Please keep using email for now.';

  readonly role = computed<RoleName>(() => (this.auth.roleName() ?? 'User') as RoleName);
  readonly isAdmin = computed(() => this.role() === 'SuperAdmin' || this.role() === 'Admin');

  readonly headline = computed(() => {
    switch (this.role()) {
      case 'SuperAdmin':
        return 'Full control of your workspace and team.';
      case 'Admin':
        return 'Manage your team and keep operations running.';
      case 'Manager':
        return 'Track your team’s jobs and performance.';
      default:
        return 'Here’s what’s happening with your work today.';
    }
  });

  readonly stats = computed<Stat[]>(() => {
    const team = this.teamCount();
    const teamValue = team !== null ? String(team) : '—';

    if (this.isAdmin()) {
      return [
        { label: 'Team Members', value: teamValue, delta: 'live', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z', tone: 'brand' },
        { label: 'Active Jobs', value: '128', delta: '+12%', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', tone: 'accent' },
        { label: 'Completion Rate', value: '94%', delta: '+3%', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', tone: 'amber' },
        { label: 'Revenue (MTD)', value: '$48.2k', delta: '+34%', icon: 'M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V6m0 12v-2', tone: 'slate' },
      ];
    }
    return [
      { label: 'Assigned Jobs', value: '14', delta: 'this week', icon: 'M9 5h6m-7 4h8m-9 4h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z', tone: 'brand' },
      { label: 'Completed', value: '9', delta: '+2', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', tone: 'accent' },
      { label: 'Hours Logged', value: '32.5', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', tone: 'amber' },
    ];
  });

  readonly firstName = computed(() => this.user()?.fullName?.split(' ')[0] ?? '');

  readonly activity = [
    { text: 'Job #4821 marked complete by field team', time: '2h ago', icon: 'M9 12l2 2 4-4' },
    { text: 'New work order created for ClearPath HVAC', time: '5h ago', icon: 'M12 4v16m8-8H4' },
    { text: 'Schedule updated for next week', time: 'Yesterday', icon: 'M8 7V3m8 4V3M3 11h18' },
    { text: 'Invoice sent to customer', time: '2 days ago', icon: 'M9 17v-2m3 2v-6m3 6v-4' },
  ];

  constructor() {
    if (this.isAdmin()) {
      this.users.getUsers().subscribe({
        next: (list) => this.teamCount.set(list.length),
        error: () => this.teamCount.set(null),
      });
    }
    // Show the SMS notice toast for 10 seconds, then dismiss it.
    setTimeout(() => this.smsToastVisible.set(false), 10_000);
  }

  dismissSmsToast(): void {
    this.smsToastVisible.set(false);
  }
}
