/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError, apiErrorLines } from '../../../../core/models/api-response.model';
import {
  MessageAttachment,
  MessageDetail as MessageDetailDto,
  RecipientStatus,
  formatBytes,
  messageChannel,
  messageStatusClass,
  messageStatusLabel,
  utc,
} from '../../../../core/models/message.model';
import { saveFileResponse } from '../../../../core/services/billing-http';
import { MessageService } from '../../../../core/services/message.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Paginator } from '../../../../shared/ui/paginator/paginator';
import { emailDocument } from '../message-frame';

const LIVE_STATUSES = ['Queued', 'Sending'];
const REFRESH_MS = 5000;

/** One sent message: header, body (sandboxed iframe), attachments, recipients with status,
 *  Retry failed and Duplicate. Refreshes every 5 s while the message is queued or sending.
 *  Push (ADR-0007): title + message as plain text (never HTML / iframe), Sent / In app only / Failed,
 *  devices per recipient; Duplicate opens the composer on Push. */
@Component({
  selector: 'app-message-detail',
  imports: [DatePipe, FormsModule, RouterLink, ConfirmDialog, Paginator],
  templateUrl: './message-detail.html',
})
export class MessageDetail implements OnDestroy {
  private readonly messages = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly access = this.messages.access;
  readonly accessLoaded = signal(false);
  readonly statusLabel = messageStatusLabel;
  readonly statusClass = messageStatusClass;
  readonly formatBytes = formatBytes;
  readonly utc = utc;
  private readonly emailStatuses: RecipientStatus[] = ['Pending', 'Sent', 'Failed', 'Skipped'];
  private readonly pushStatuses: RecipientStatus[] = ['Pending', 'Sent', 'InAppOnly', 'Failed'];

  readonly id = signal(0);
  readonly message = signal<MessageDetailDto | null>(null);
  readonly loading = signal(false);
  readonly notFound = signal(false);
  readonly error = signal('');
  readonly recipientPage = signal(1);
  readonly recipientPageSize = signal(50);
  readonly recipientStatus = signal<RecipientStatus | ''>('');
  readonly confirmRetry = signal(false);
  readonly retrying = signal(false);
  readonly downloading = signal<number | null>(null);

  readonly live = computed(() => LIVE_STATUSES.includes(this.message()?.status ?? ''));
  readonly isPush = computed(() => messageChannel(this.message()) === 'Push');
  readonly recipientStatuses = computed(() => (this.isPush() ? this.pushStatuses : this.emailStatuses));
  /** Push: `sentCount` = delivered (Sent + InAppOnly, contract §4.5); this is the part pushed to a phone. */
  readonly pushedCount = computed(() => {
    const m = this.message();
    return m ? Math.max(0, m.sentCount - (m.inAppOnlyCount ?? 0)) : 0;
  });
  readonly files = computed(() => (this.message()?.attachments ?? []).filter((a) => !a.isInline));
  readonly inlineCount = computed(() => (this.message()?.attachments ?? []).filter((a) => a.isInline).length);
  /** Body kept in its own signal (string equality) so refreshes while sending never reload the iframe. */
  private readonly bodyHtml = signal<string | null>(null);
  readonly bodyDoc = computed<SafeHtml | null>(() => {
    const html = this.bodyHtml();
    // Server-sanitized HTML in a sandbox="" iframe (no scripts, unique origin).
    return html == null ? null : this.sanitizer.bypassSecurityTrustHtml(emailDocument(html));
  });
  readonly progress = computed(() => {
    const m = this.message();
    if (!m || !m.recipientCount) return 0;
    return Math.round(((m.sentCount + m.failedCount) / m.recipientCount) * 100);
  });

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      this.id.set(Number(p.get('id')) || 0);
      this.message.set(null);
      this.bodyHtml.set(null);
      this.recipientPage.set(1);
      this.recipientStatus.set('');
      if (this.accessLoaded() && this.access()?.canView) this.load();
    });
    this.messages
      .loadAccess()
      .pipe(takeUntilDestroyed())
      .subscribe((a) => {
        this.accessLoaded.set(true);
        if (a?.canView) this.load();
      });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  /** Loads the message; `silent` = background refresh (no spinner, errors ignored). */
  load(silent = false): void {
    clearTimeout(this.timer);
    if (!this.id()) {
      this.notFound.set(true);
      return;
    }
    if (!silent) {
      this.loading.set(true);
      this.error.set('');
    }
    this.messages
      .detail(this.id(), {
        recipientPage: this.recipientPage(),
        recipientPageSize: this.recipientPageSize(),
        recipientStatus: this.recipientStatus() || null,
      })
      .subscribe({
        next: (m) => {
          this.message.set(m);
          // Push bodies are plain text: never fed to the HTML iframe.
          this.bodyHtml.set(messageChannel(m) === 'Push' ? null : (m.bodyHtml ?? ''));
          this.loading.set(false);
          this.notFound.set(false);
          this.scheduleRefresh();
        },
        error: (err: ApiError) => {
          this.loading.set(false);
          if (silent) {
            this.scheduleRefresh();
            return;
          }
          if (err?.status === 404) this.notFound.set(true);
          else this.error.set(apiErrorLines(err, 'Could not load the message.').message);
        },
      });
  }

  private scheduleRefresh(): void {
    clearTimeout(this.timer);
    if (this.live()) this.timer = setTimeout(() => this.load(true), REFRESH_MS);
  }

  setRecipientStatus(status: RecipientStatus | ''): void {
    this.recipientStatus.set(status);
    this.recipientPage.set(1);
    this.load();
  }

  goRecipientPage(page: number): void {
    this.recipientPage.set(page);
    this.load();
  }

  setRecipientPageSize(size: number): void {
    this.recipientPageSize.set(size);
    this.recipientPage.set(1);
    this.load();
  }

  download(a: MessageAttachment): void {
    if (a.isPurged) return;
    this.downloading.set(a.attachmentId);
    this.messages.downloadAttachment(this.id(), a.attachmentId).subscribe({
      next: (res) => {
        this.downloading.set(null);
        saveFileResponse(res, a.fileName);
      },
      error: (err) => {
        this.downloading.set(null);
        // A blob error body has no readable envelope: explain the 404 (retention purge) here.
        this.toast.error(
          (err as ApiError)?.status === 404
            ? 'This attachment is no longer available (removed after the retention period).'
            : apiErrorLines(err, 'The attachment could not be downloaded.').message,
        );
      },
    });
  }

  retry(): void {
    this.confirmRetry.set(false);
    this.retrying.set(true);
    this.messages.retry(this.id()).subscribe({
      next: (r) => {
        this.retrying.set(false);
        this.toast.success(`${r.requeuedCount} failed recipient${r.requeuedCount === 1 ? '' : 's'} queued again.`);
        this.messages.loadAccess(true).subscribe();
        this.load();
      },
      error: (err) => {
        this.retrying.set(false);
        this.toast.error(apiErrorLines(err, 'Could not retry the failed recipients.').message);
      },
    });
  }

  duplicate(): void {
    const queryParams: Record<string, string | number> = { from: this.id() };
    if (this.isPush()) queryParams['channel'] = 'push';
    this.router.navigate(['/dashboard/messages/compose'], { queryParams });
  }

  replyToLabel(m: MessageDetailDto): string {
    switch (m.replyToMode) {
      case 'NoReply': return 'No reply';
      case 'Sender': return m.replyToAddress ? `Sender (${m.replyToAddress})` : 'Sender';
      case 'Agency': return m.replyToAddress ? `Agency (${m.replyToAddress})` : 'Agency email';
      default: return m.replyToAddress ?? 'Custom';
    }
  }

  fieldLabel(field: string): string {
    switch (field) {
      case 'Self': return this.isPush() ? 'Sender’s devices' : 'Copy to sender';
      case 'Cc': return 'CC';
      case 'Bcc': return 'BCC';
      default: return field;
    }
  }
}
