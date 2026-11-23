/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import { MessageAccessLevel, MessageSettings, utc } from '../../../../core/models/message.model';
import { MessageService } from '../../../../core/services/message.service';
import { ToastService } from '../../../../core/services/toast.service';

/** Numeric limits and their allowed ranges (the DB CHECK constraints, contract §1). */
const LIMITS = {
  maxRecipientsPerMessage: { min: 1, max: 5000, label: 'Max recipients per message' },
  dailySendLimit: { min: 1, max: 100000, label: 'Daily send limit' },
  sendRatePerSecond: { min: 1, max: 50, label: 'Send rate' },
  attachmentRetentionDays: { min: 1, max: 3650, label: 'Attachment retention' },
} as const;
type LimitKey = keyof typeof LIMITS;

/**
 * Settings ▸ Messages (ADR-0006 D1): who may send / view custom messages, external addresses,
 * reply-to choices, limits and attachment retention. SuperAdmin edits ([canEdit]); Admins /
 * Managers with message access see it read-only.
 */
@Component({
  selector: 'app-message-settings',
  imports: [FormsModule, DatePipe],
  templateUrl: './message-settings.html',
})
export class MessageSettingsTab {
  private readonly messages = inject(MessageService);
  private readonly toast = inject(ToastService);

  readonly canEdit = input(false);

  readonly levels: MessageAccessLevel[] = ['None', 'Read', 'Write'];
  readonly limits = LIMITS;
  readonly utc = utc;
  readonly settings = signal<MessageSettings | null>(null);
  readonly form = signal<MessageSettings | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saving = signal(false);

  readonly dirty = computed(() => {
    const a = this.settings();
    const b = this.form();
    return !!a && !!b && JSON.stringify({ ...a, updatedOn: null }) !== JSON.stringify({ ...b, updatedOn: null });
  });

  readonly errors = computed(() => {
    const f = this.form();
    if (!f) return [] as string[];
    const out: string[] = [];
    for (const key of Object.keys(LIMITS) as LimitKey[]) {
      const v = Number(f[key]);
      const r = LIMITS[key];
      if (!Number.isInteger(v) || v < r.min || v > r.max) out.push(`${r.label} must be a whole number from ${r.min} to ${r.max.toLocaleString()}.`);
    }
    return out;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.messages.getSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.form.set({ ...s });
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(apiErrorLines(err, 'Could not load the message settings.').message);
        this.loading.set(false);
      },
    });
  }

  patch(change: Partial<MessageSettings>): void {
    const f = this.form();
    if (f) this.form.set({ ...f, ...change });
  }

  reset(): void {
    const s = this.settings();
    if (s) this.form.set({ ...s });
  }

  save(): void {
    const f = this.form();
    if (!f || !this.canEdit()) return;
    if (this.errors().length) {
      this.toast.error(this.errors()[0]);
      return;
    }
    this.saving.set(true);
    const body: MessageSettings = {
      ...f,
      maxRecipientsPerMessage: Number(f.maxRecipientsPerMessage),
      dailySendLimit: Number(f.dailySendLimit),
      sendRatePerSecond: Number(f.sendRatePerSecond),
      attachmentRetentionDays: Number(f.attachmentRetentionDays),
    };
    this.messages.updateSettings(body).subscribe({
      next: (s) => {
        this.settings.set(s);
        this.form.set({ ...s });
        this.saving.set(false);
        this.toast.success('Message settings saved.');
        this.messages.loadAccess(true).subscribe();
      },
      error: (err) => {
        this.saving.set(false);
        const { message, errors } = apiErrorLines(err, 'Could not save the message settings.');
        this.toast.error([message, ...errors].filter(Boolean).join(' '));
      },
    });
  }
}
