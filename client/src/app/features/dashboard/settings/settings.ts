import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Question } from '../../../core/models/application.model';
import { ApplicationService } from '../../../core/services/application.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** SuperAdmin configuration of the public application form. */
@Component({
  selector: 'app-settings',
  imports: [FormsModule, Alert],
  templateUrl: './settings.html',
})
export class Settings {
  private readonly service = inject(ApplicationService);

  readonly loading = signal(true);
  readonly error = signal('');

  // Settings fields
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

  constructor() {
    this.loadSettings();
    this.loadQuestions();
  }

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
      .updateQuestion(q.questionId, {
        questionText: q.questionText,
        isRequired: !q.isRequired,
        isActive: q.isActive,
        sortOrder: q.sortOrder,
      })
      .subscribe({ next: () => this.loadQuestions(), error: (e: Error) => this.questionError.set(e.message) });
  }

  toggleActive(q: Question): void {
    this.service
      .updateQuestion(q.questionId, {
        questionText: q.questionText,
        isRequired: q.isRequired,
        isActive: !q.isActive,
        sortOrder: q.sortOrder,
      })
      .subscribe({ next: () => this.loadQuestions(), error: (e: Error) => this.questionError.set(e.message) });
  }

  remove(q: Question): void {
    this.service.deleteQuestion(q.questionId).subscribe({
      next: () => this.loadQuestions(),
      error: (e: Error) => this.questionError.set(e.message),
    });
  }
}
