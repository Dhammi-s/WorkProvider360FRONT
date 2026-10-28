/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HelpVideo, HelpVideoAccess, HelpVideoSettings } from '../../../core/models/help-video.model';
import { AuthService } from '../../../core/services/auth.service';
import { HelpVideoService } from '../../../core/services/help-video.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { HELP_FAQS, HELP_TOPICS, HelpFaq } from './help-content';

/** Upload / edit form; the file is only set when uploading. */
interface VideoForm {
  helpVideoId: number | null;
  title: string;
  description: string;
  topic: string;
  showToAdmin: boolean;
  showToManager: boolean;
  showToUser: boolean;
  sortOrder: number;
  file: File | null;
}

const MAX_VIDEO_MB = 100;

const emptyForm = (topic: string): VideoForm => ({
  helpVideoId: null,
  title: '',
  description: '',
  topic,
  showToAdmin: true,
  showToManager: true,
  showToUser: false,
  sortOrder: 0,
  file: null,
});

/**
 * Help centre: every feature explained, grouped by topic and searchable, plus
 * how-to videos per topic. Signed-in staff see the videos shown to their role;
 * Super Admin (and Admin / Manager when allowed) upload videos straight to the
 * agency's Cloudinary account.
 */
@Component({
  selector: 'app-help',
  imports: [DatePipe, FormsModule, RouterLink, Alert, ConfirmDialog],
  templateUrl: './help.html',
})
export class Help {
  private readonly auth = inject(AuthService);
  private readonly videoService = inject(HelpVideoService);

  readonly topics = HELP_TOPICS;
  readonly query = signal('');
  readonly topic = signal<string>('');
  readonly openKey = signal<string | null>(null);

  /** Videos need a signed-in staff member (the public /help page shows FAQs only). */
  readonly signedIn = computed(() => this.auth.isAuthenticated() && this.auth.roleName() !== 'Client');
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');
  readonly access = signal<HelpVideoAccess | null>(null);
  readonly canManage = computed(() => !!this.access()?.canManage);
  readonly videos = signal<HelpVideo[]>([]);
  readonly playing = signal<number | null>(null);

  readonly form = signal<VideoForm | null>(null);
  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly notice = signal('');
  readonly error = signal('');
  readonly confirmDelete = signal<HelpVideo | null>(null);

  readonly settings = signal<HelpVideoSettings | null>(null);
  readonly settingsSaving = signal(false);

  private matches(text: string): boolean {
    const q = this.query().trim().toLowerCase();
    return !q || text.toLowerCase().includes(q);
  }

  readonly filteredFaqs = computed<HelpFaq[]>(() =>
    HELP_FAQS.filter((f) => (!this.topic() || f.topic === this.topic()) && this.matches(`${f.q} ${f.a} ${f.topic}`)),
  );

  readonly filteredVideos = computed<HelpVideo[]>(() =>
    this.videos().filter(
      (v) => (!this.topic() || v.topic === this.topic()) && this.matches(`${v.title} ${v.description ?? ''} ${v.topic}`),
    ),
  );

  /** Topics in display order with their matching FAQs and videos. */
  readonly sections = computed(() =>
    this.topics
      .map((t) => ({
        topic: t,
        faqs: this.filteredFaqs().filter((f) => f.topic === t),
        videos: this.filteredVideos().filter((v) => v.topic === t),
      }))
      .filter((s) => s.faqs.length || s.videos.length),
  );

  readonly videoCountByTopic = computed(() => {
    const m = new Map<string, number>();
    for (const v of this.videos()) m.set(v.topic, (m.get(v.topic) ?? 0) + 1);
    return m;
  });

  constructor() {
    if (this.signedIn()) {
      this.videoService.access().subscribe({ next: (a) => this.access.set(a), error: () => {} });
      this.loadVideos();
      if (this.isSuperAdmin()) {
        this.videoService.getSettings().subscribe({ next: (s) => this.settings.set(s), error: () => {} });
      }
    }
  }

  loadVideos(): void {
    this.videoService.list().subscribe({ next: (v) => this.videos.set(v), error: () => this.videos.set([]) });
  }

  toggle(key: string): void {
    this.openKey.set(this.openKey() === key ? null : key);
  }

  duration(v: HelpVideo): string {
    if (!v.durationSeconds) return '';
    const s = Math.round(v.durationSeconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  audience(v: HelpVideo): string {
    const roles = ['Super Admin'];
    if (v.showToAdmin) roles.push('Admin');
    if (v.showToManager) roles.push('Manager');
    if (v.showToUser) roles.push('User');
    return roles.join(', ');
  }

  // ------------------------------------------------------------- Upload / edit

  startUpload(): void {
    this.form.set(emptyForm(this.topic() || this.topics[0]));
    this.notice.set('');
    this.error.set('');
  }

  startEdit(v: HelpVideo): void {
    this.form.set({
      helpVideoId: v.helpVideoId,
      title: v.title,
      description: v.description ?? '',
      topic: v.topic,
      showToAdmin: v.showToAdmin,
      showToManager: v.showToManager,
      showToUser: v.showToUser,
      sortOrder: v.sortOrder,
      file: null,
    });
    this.notice.set('');
    this.error.set('');
  }

  patch(p: Partial<VideoForm>): void {
    this.form.update((f) => (f ? { ...f, ...p } : f));
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (file && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      this.error.set(`The video is larger than ${MAX_VIDEO_MB} MB. Compress it or trim it before uploading.`);
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.error.set('');
    this.patch({ file, title: this.form()?.title || (file ? file.name.replace(/\.[^.]+$/, '') : '') });
  }

  save(): void {
    const f = this.form();
    if (!f) return;
    if (!f.title.trim()) {
      this.error.set('Give the video a title.');
      return;
    }
    const details = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      topic: f.topic,
      showToAdmin: f.showToAdmin,
      showToManager: f.showToManager,
      showToUser: f.showToUser,
      sortOrder: Number(f.sortOrder) || 0,
    };
    this.error.set('');

    if (f.helpVideoId) {
      this.uploading.set(true);
      this.videoService.update(f.helpVideoId, details).subscribe({
        next: () => this.finish('Video saved.'),
        error: (err: Error) => this.fail(err, 'Could not save the video.'),
      });
      return;
    }

    if (!f.file) {
      this.error.set('Choose a video file to upload.');
      return;
    }
    this.uploading.set(true);
    this.progress.set(0);
    this.videoService.uploadSignature().subscribe({
      next: (sig) =>
        this.videoService.uploadToCloudinary(f.file!, sig).subscribe({
          next: (p) => {
            this.progress.set(p.progress);
            if (p.done) {
              this.videoService
                .create({
                  ...details,
                  publicId: p.done.public_id,
                  videoUrl: p.done.secure_url,
                  durationSeconds: p.done.duration ?? null,
                  bytes: p.done.bytes ?? f.file!.size,
                })
                .subscribe({
                  next: () => this.finish('Video uploaded to the Help Center.'),
                  error: (err: Error) => this.fail(err, 'The video uploaded but could not be saved.'),
                });
            }
          },
          error: (err: { error?: { error?: { message?: string } }; message?: string }) =>
            this.fail(new Error(err?.error?.error?.message ?? err?.message ?? ''), 'Cloudinary rejected the upload.'),
        }),
      error: (err: Error) => this.fail(err, 'Could not start the upload.'),
    });
  }

  private finish(message: string): void {
    this.uploading.set(false);
    this.form.set(null);
    this.notice.set(message);
    this.loadVideos();
  }

  private fail(err: Error, fallback: string): void {
    this.uploading.set(false);
    this.error.set(err.message || fallback);
  }

  remove(v: HelpVideo): void {
    this.confirmDelete.set(null);
    this.videoService.remove(v.helpVideoId).subscribe({
      next: (msg) => {
        this.notice.set(msg);
        this.loadVideos();
      },
      error: (err: Error) => this.error.set(err.message || 'Could not delete the video.'),
    });
  }

  // ------------------------------------------------------------ Settings

  patchSettings(p: Partial<HelpVideoSettings>): void {
    this.settings.update((s) => (s ? { ...s, ...p } : s));
  }

  saveSettings(): void {
    const s = this.settings();
    if (!s) return;
    this.settingsSaving.set(true);
    this.videoService.updateSettings(s).subscribe({
      next: (saved) => {
        this.settings.set(saved);
        this.settingsSaving.set(false);
        this.notice.set('Help video permissions saved.');
      },
      error: (err: Error) => {
        this.settingsSaving.set(false);
        this.error.set(err.message || 'Could not save the settings.');
      },
    });
  }
}
