import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Question } from '../../../core/models/application.model';
import { AccessLevel, SchedulingAccess } from '../../../core/models/scheduler.model';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { LogService } from '../../../core/services/log.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { LogoUploader } from '../branding/logo-uploader';

/** Workspace settings: application form (SuperAdmin) + scheduling access & defaults. */
interface SettingsTab {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink, Alert, LogoUploader],
  templateUrl: './settings.html',
})
export class Settings {
  private readonly service = inject(ApplicationService);
  private readonly scheduler = inject(SchedulerService);
  private readonly logs = inject(LogService);
  private readonly announcements = inject(AnnouncementService);
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');
  readonly isAdmin = computed(() => this.auth.roleName() === 'Admin');

  readonly activeTab = signal<string>('profile');

  readonly tabs = computed<SettingsTab[]>(() => {
    const t: SettingsTab[] = [
      { id: 'profile', label: 'Company Profile', icon: 'M3 21h18M4 21V7l8-4 8 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1' },
    ];
    if (this.isSuperAdmin() || this.isAdmin())
      t.push({ id: 'team', label: 'Team Members', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z' });
    if (this.schedAccess()?.canManageAccess)
      t.push({ id: 'roles', label: 'Roles & Permissions', icon: 'M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z' });
    if (this.showScheduling())
      t.push({ id: 'scheduling', label: 'Scheduling', icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' });
    if (this.isSuperAdmin())
      t.push({ id: 'application', label: 'Application Form', icon: 'M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2z' });
    if (this.isSuperAdmin())
      t.push({ id: 'logs', label: 'Log Access', icon: 'M4 6h16M4 6a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2M4 6l8 6 8-6' });
    if (this.isSuperAdmin())
      t.push({ id: 'announcements', label: 'Announcements', icon: 'M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6' });
    return t;
  });

  setTab(id: string): void {
    this.activeTab.set(id);
  }

  readonly loading = signal(true);
  readonly error = signal('');

  // Application settings (SuperAdmin only)
  readonly requirePhone = signal(true);
  readonly requireAddress = signal(true);
  readonly emailNotificationsEnabled = signal(true);
  readonly notificationEmail = signal('');
  readonly saving = signal(false);
  readonly saveNotice = signal('');

  // Questions
  readonly questions = signal<Question[]>([]);
  readonly newQuestionText = signal('');
  readonly newQuestionRequired = signal(true);
  readonly questionBusy = signal(false);
  readonly questionError = signal('');

  // Scheduling access + defaults
  readonly levels: AccessLevel[] = ['None', 'Read', 'Write'];
  readonly schedAccess = signal<SchedulingAccess | null>(null);
  readonly adminAccess = signal<AccessLevel>('Write');
  readonly managerAccess = signal<AccessLevel>('Read');
  readonly defRate = signal(0);
  readonly defOt = signal(1.5);
  readonly notifyAdmin = signal(false);
  readonly notifyManager = signal(false);
  readonly autoClock = signal(false);
  readonly schedError = signal('');
  readonly accessSaving = signal(false);
  readonly accessNotice = signal('');
  readonly defaultsSaving = signal(false);
  readonly defaultsNotice = signal('');

  // Log access (SuperAdmin only)
  readonly adminCanViewLogs = signal(false);
  readonly managerCanViewLogs = signal(false);
  readonly logSaving = signal(false);
  readonly logNotice = signal('');
  readonly logError = signal('');

  // Announcement visibility (SuperAdmin only)
  readonly annShowAdmin = signal(true);
  readonly annShowManager = signal(true);
  readonly annShowUser = signal(true);
  readonly annSaving = signal(false);
  readonly annNotice = signal('');
  readonly annError = signal('');

  readonly canManageSched = computed(() => !!this.schedAccess()?.canManage);
  readonly showScheduling = computed(() => {
    const a = this.schedAccess();
    return !!a && a.accessLevel !== 'None';
  });

  constructor() {
    if (this.isSuperAdmin()) {
      this.loadSettings();
      this.loadQuestions();
      this.loadLogSettings();
      this.loadAnnouncementSettings();
    } else {
      this.loading.set(false);
    }
    this.loadScheduling();
  }

  // ---- Announcement visibility ----
  loadAnnouncementSettings(): void {
    this.announcements.getSettings().subscribe({
      next: (s) => {
        this.annShowAdmin.set(s.showToAdmin);
        this.annShowManager.set(s.showToManager);
        this.annShowUser.set(s.showToUser);
      },
      error: () => {},
    });
  }

  saveAnnouncementSettings(): void {
    this.annSaving.set(true);
    this.annNotice.set('');
    this.annError.set('');
    this.announcements
      .updateSettings({ showToAdmin: this.annShowAdmin(), showToManager: this.annShowManager(), showToUser: this.annShowUser() })
      .subscribe({
        next: () => {
          this.annSaving.set(false);
          this.annNotice.set('Announcement visibility updated.');
        },
        error: (err: Error) => {
          this.annSaving.set(false);
          this.annError.set(err.message || 'Could not save.');
        },
      });
  }

  // ---- Log access ----
  loadLogSettings(): void {
    this.logs.getSettings().subscribe({
      next: (s) => {
        this.adminCanViewLogs.set(s.adminCanViewLogs);
        this.managerCanViewLogs.set(s.managerCanViewLogs);
      },
      error: () => {},
    });
  }

  saveLogSettings(): void {
    this.logSaving.set(true);
    this.logNotice.set('');
    this.logError.set('');
    this.logs
      .updateSettings({ adminCanViewLogs: this.adminCanViewLogs(), managerCanViewLogs: this.managerCanViewLogs() })
      .subscribe({
        next: () => {
          this.logSaving.set(false);
          this.logNotice.set('Log access updated.');
        },
        error: (err: Error) => {
          this.logSaving.set(false);
          this.logError.set(err.message || 'Could not save log access.');
        },
      });
  }

  // ---- Application settings ----
  loadSettings(): void {
    this.loading.set(true);
    this.service.getSettings().subscribe({
      next: (s) => {
        this.requirePhone.set(s.requirePhone);
        this.requireAddress.set(s.requireAddress);
        this.emailNotificationsEnabled.set(s.emailNotificationsEnabled);
        this.notificationEmail.set(s.notificationEmail ?? '');
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load settings.');
        this.loading.set(false);
      },
    });
  }

  loadQuestions(): void {
    this.service.getQuestions().subscribe({
      next: (q) => this.questions.set(q),
      error: () => this.questions.set([]),
    });
  }

  saveSettings(): void {
    this.saving.set(true);
    this.saveNotice.set('');
    this.error.set('');
    this.service
      .updateSettings({
        requirePhone: this.requirePhone(),
        requireAddress: this.requireAddress(),
        emailNotificationsEnabled: this.emailNotificationsEnabled(),
        notificationEmail: this.notificationEmail().trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saveNotice.set('Settings saved.');
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not save settings.');
          this.saving.set(false);
        },
      });
  }

  addQuestion(): void {
    const text = this.newQuestionText().trim();
    if (!text) return;
    this.questionBusy.set(true);
    this.questionError.set('');
    this.service
      .createQuestion({ questionText: text, isRequired: this.newQuestionRequired(), sortOrder: this.questions().length })
      .subscribe({
        next: () => {
          this.newQuestionText.set('');
          this.newQuestionRequired.set(true);
          this.questionBusy.set(false);
          this.loadQuestions();
        },
        error: (err: Error) => {
          this.questionError.set(err.message || 'Could not add question.');
          this.questionBusy.set(false);
        },
      });
  }

  toggleRequired(q: Question): void {
    this.service
      .updateQuestion(q.questionId, { questionText: q.questionText, isRequired: !q.isRequired, isActive: q.isActive, sortOrder: q.sortOrder })
      .subscribe({ next: () => this.loadQuestions(), error: (e: Error) => this.questionError.set(e.message) });
  }

  toggleActive(q: Question): void {
    this.service
      .updateQuestion(q.questionId, { questionText: q.questionText, isRequired: q.isRequired, isActive: !q.isActive, sortOrder: q.sortOrder })
      .subscribe({ next: () => this.loadQuestions(), error: (e: Error) => this.questionError.set(e.message) });
  }

  remove(q: Question): void {
    this.service.deleteQuestion(q.questionId).subscribe({
      next: () => this.loadQuestions(),
      error: (e: Error) => this.questionError.set(e.message),
    });
  }

  // ---- Scheduling ----
  loadScheduling(): void {
    this.scheduler.getAccess().subscribe({
      next: (a) => {
        this.schedAccess.set(a);
        if (a.accessLevel !== 'None') this.loadSchedSettings();
      },
      error: () => this.schedAccess.set(null),
    });
  }

  loadSchedSettings(): void {
    this.scheduler.getSettings().subscribe({
      next: (s) => {
        this.adminAccess.set(s.adminAccess === 'Self' ? 'Write' : s.adminAccess);
        this.managerAccess.set(s.managerAccess === 'Self' ? 'Read' : s.managerAccess);
        this.defRate.set(s.defaultPayRatePerHour);
        this.defOt.set(s.defaultOvertimeMultiplier);
        this.notifyAdmin.set(s.notifyAdminOnCreate);
        this.notifyManager.set(s.notifyManagerOnCreate);
        this.autoClock.set(s.autoClockEnabled);
      },
      error: (err: Error) => this.schedError.set(err.message || 'Could not load scheduling settings.'),
    });
  }

  saveAccess(): void {
    this.accessSaving.set(true);
    this.accessNotice.set('');
    this.schedError.set('');
    this.scheduler.updateAccess({ adminAccess: this.adminAccess(), managerAccess: this.managerAccess() }).subscribe({
      next: () => {
        this.accessSaving.set(false);
        this.accessNotice.set('Access settings saved.');
      },
      error: (err: Error) => {
        this.schedError.set(err.message || 'Could not save access settings.');
        this.accessSaving.set(false);
      },
    });
  }

  saveDefaults(): void {
    this.defaultsSaving.set(true);
    this.defaultsNotice.set('');
    this.schedError.set('');
    this.scheduler
      .updateDefaults({
        defaultPayRatePerHour: Number(this.defRate()) || 0,
        defaultOvertimeMultiplier: Number(this.defOt()) || 1.5,
        notifyAdminOnCreate: this.notifyAdmin(),
        notifyManagerOnCreate: this.notifyManager(),
        autoClockEnabled: this.autoClock(),
      })
      .subscribe({
        next: () => {
          this.defaultsSaving.set(false);
          this.defaultsNotice.set('Defaults saved.');
        },
        error: (err: Error) => {
          this.schedError.set(err.message || 'Could not save defaults.');
          this.defaultsSaving.set(false);
        },
      });
  }
}
