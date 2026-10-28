/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import {
  SaveTrainingRequest,
  Training,
  TrainingContentType,
  TrainingQuizQuestionInput,
} from '../../../core/models/training.model';
import { TrainingSessionService } from '../../../core/services/training-session.service';
import { TrainingService } from '../../../core/services/training.service';
import { Alert } from '../../../shared/ui/alert/alert';

interface Draft {
  trainingId: number | null;
  title: string;
  description: string;
  contentType: TrainingContentType;
  contentUrl: string;
  publicId: string | null;
  fileName: string | null;
  durationMinutes: number | null;
  passMarkPercent: number;
  questions: TrainingQuizQuestionInput[];
}

/**
 * Training catalog. Super Admins and Admins create and edit trainings (video
 * uploaded to Cloudinary, PDF uploaded or linked, or a quiz built here);
 * Managers see the catalog read-only so they know what they can assign.
 */
@Component({
  selector: 'app-training-catalog',
  imports: [FormsModule, Alert],
  templateUrl: './training-catalog.html',
})
export class TrainingCatalog {
  private readonly training = inject(TrainingService);
  private readonly session = inject(TrainingSessionService);

  readonly canManage = computed(() => ['SuperAdmin', 'Admin'].includes(this.session.user()?.roleName ?? ''));
  readonly items = signal<Training[]>([]);
  readonly showArchived = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly success = signal('');

  readonly draft = signal<Draft | null>(null);
  readonly saving = signal(false);
  readonly uploadProgress = signal<number | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.training.trainings(this.showArchived()).subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  toggleArchived(): void {
    this.showArchived.update((v) => !v);
    this.load();
  }

  icon(type: string): string {
    return type === 'Video' ? '🎬' : type === 'Quiz' ? '❓' : '📄';
  }

  // ---------------------------------------------------------------- editor

  newTraining(type: TrainingContentType = 'Video'): void {
    this.error.set('');
    this.draft.set({
      trainingId: null,
      title: '',
      description: '',
      contentType: type,
      contentUrl: '',
      publicId: null,
      fileName: null,
      durationMinutes: null,
      passMarkPercent: 80,
      questions: type === 'Quiz' ? [this.blankQuestion()] : [],
    });
  }

  edit(t: Training): void {
    this.error.set('');
    this.training.training(t.trainingId).subscribe({
      next: (full) =>
        this.draft.set({
          trainingId: full.trainingId,
          title: full.title,
          description: full.description ?? '',
          contentType: full.contentType,
          contentUrl: full.contentUrl ?? '',
          publicId: full.publicId ?? null,
          fileName: full.fileName ?? null,
          durationMinutes: full.durationMinutes ?? null,
          passMarkPercent: full.passMarkPercent ?? 80,
          questions: (full.questions ?? []).map((q) => ({
            questionText: q.questionText,
            options: [...q.options],
            correctOptionIndex: q.correctOptionIndex ?? 0,
          })),
        }),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  patch(changes: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...changes } : d));
  }

  setType(type: TrainingContentType): void {
    const d = this.draft();
    if (!d) return;
    this.patch({ contentType: type, questions: type === 'Quiz' && d.questions.length === 0 ? [this.blankQuestion()] : d.questions });
  }

  private blankQuestion(): TrainingQuizQuestionInput {
    return { questionText: '', options: ['', ''], correctOptionIndex: 0 };
  }

  addQuestion(): void {
    this.draft.update((d) => (d ? { ...d, questions: [...d.questions, this.blankQuestion()] } : d));
  }

  removeQuestion(i: number): void {
    this.draft.update((d) => (d ? { ...d, questions: d.questions.filter((_, idx) => idx !== i) } : d));
  }

  updateQuestion(i: number, changes: Partial<TrainingQuizQuestionInput>): void {
    this.draft.update((d) => (d ? { ...d, questions: d.questions.map((q, idx) => (idx === i ? { ...q, ...changes } : q)) } : d));
  }

  updateOption(qi: number, oi: number, value: string): void {
    const q = this.draft()?.questions[qi];
    if (q) this.updateQuestion(qi, { options: q.options.map((o, idx) => (idx === oi ? value : o)) });
  }

  addOption(qi: number): void {
    const q = this.draft()?.questions[qi];
    if (q && q.options.length < 6) this.updateQuestion(qi, { options: [...q.options, ''] });
  }

  removeOption(qi: number, oi: number): void {
    const q = this.draft()?.questions[qi];
    if (!q || q.options.length <= 2) return;
    const correct = q.correctOptionIndex === oi ? 0 : q.correctOptionIndex > oi ? q.correctOptionIndex - 1 : q.correctOptionIndex;
    this.updateQuestion(qi, { options: q.options.filter((_, idx) => idx !== oi), correctOptionIndex: correct });
  }

  /** Direct upload to the agency's Cloudinary (video or PDF). */
  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const d = this.draft();
    if (!file || !d || d.contentType === 'Quiz') return;
    const kind = d.contentType;
    if (kind === 'Document' && !/\.pdf$/i.test(file.name)) {
      this.error.set('Please choose a PDF file.');
      return;
    }
    this.error.set('');
    this.uploadProgress.set(0);
    this.training
      .uploadSignature(kind)
      .pipe(switchMap((sig) => this.training.uploadToCloudinary(file, sig, kind)))
      .subscribe({
        next: (p) => {
          this.uploadProgress.set(p.progress);
          if (p.url) {
            this.patch({ contentUrl: p.url, publicId: p.publicId ?? null, fileName: file.name });
            this.uploadProgress.set(null);
          }
        },
        error: (e: Error) => {
          this.uploadProgress.set(null);
          this.error.set(e.message || 'Upload failed. You can paste a link instead.');
        },
      });
    input.value = '';
  }

  save(): void {
    const d = this.draft();
    if (!d) return;
    if (!d.title.trim()) {
      this.error.set('Give the training a title.');
      return;
    }
    const request: SaveTrainingRequest = {
      title: d.title.trim(),
      description: d.description.trim() || null,
      contentType: d.contentType,
      contentUrl: d.contentType === 'Quiz' ? null : d.contentUrl.trim() || null,
      publicId: d.contentType === 'Quiz' ? null : d.publicId,
      fileName: d.contentType === 'Quiz' ? null : d.fileName,
      durationMinutes: d.durationMinutes || null,
      passMarkPercent: d.contentType === 'Quiz' ? d.passMarkPercent : null,
      questions: d.contentType === 'Quiz' ? d.questions : null,
    };
    this.saving.set(true);
    this.error.set('');
    const call = d.trainingId ? this.training.updateTraining(d.trainingId, request) : this.training.createTraining(request);
    call.subscribe({
      next: (t) => {
        this.saving.set(false);
        this.draft.set(null);
        this.success.set(`"${t.title}" saved.`);
        this.load();
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.error.set(e.message);
      },
    });
  }

  setActive(t: Training, isActive: boolean): void {
    this.training.setTrainingActive(t.trainingId, isActive).subscribe({
      next: (r) => {
        this.success.set(r.message ?? 'Saved.');
        this.load();
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
