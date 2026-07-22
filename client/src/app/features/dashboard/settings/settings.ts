import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Question } from '../../../core/models/application.model';
import { AccessLevel, SchedulingAccess } from '../../../core/models/scheduler.model';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Workspace settings: application form (SuperAdmin) + scheduling access & defaults. */
@Component({
  selector: 'app-settings',
  imports: [FormsModule, Alert],
  templateUrl: './settings.html',
})
export class Settings {
  private readonly service = inject(ApplicationService);
  private readonly scheduler = inject(SchedulerService);
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');

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
  readonly schedError = signal('');
  readonly accessSaving = signal(false);
  readonly accessNotice = signal('');
  readonly defaultsSaving = signal(false);
  readonly defaultsNotice = signal('');

  readonly canManageSched = computed(() => !!this.schedAccess()?.canManage);
  readonly showScheduling = computed(() => {
    const a = this.schedAccess();
    return !!a && a.accessLevel !== 'None';
  });

  constructor() {
    if (this.isSuperAdmin()) {
      this.loadSettings();
      this.loadQuestions();
    } else {
      this.loading.set(false);
    }
    this.loadScheduling();
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
