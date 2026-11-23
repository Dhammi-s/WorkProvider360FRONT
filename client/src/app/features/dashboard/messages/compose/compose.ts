/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import {
  MessageChannel,
  PUSH_MAX_MESSAGE,
  PUSH_MAX_TITLE,
  PreviewResult,
  ReplyToMode,
  ReplyToOption,
  ResolveRequest,
  ResolveResult,
  SendMessageRequest,
  SendPushRequest,
  formatBytes,
  messageChannel,
  pushUnavailableText,
  skipReasonLabel,
} from '../../../../core/models/message.model';
import { MessageService } from '../../../../core/services/message.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PickerChip, RecipientPicker, toApiChip } from '../../../../shared/ui/recipient-picker/recipient-picker';
import { RichTextEditor } from '../../../../shared/ui/rich-text-editor/rich-text-editor';
import { emailDocument } from '../message-frame';

/** Contract defaults, used until / unless the access call says otherwise. */
const DEFAULT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xlsx', 'jpg', 'jpeg', 'png'];
const DEFAULT_MAX_FILE = 10 * 1024 * 1024;
const DEFAULT_MAX_TOTAL = 20 * 1024 * 1024;
const DEFAULT_MAX_FILES = 5;
const EMAIL_RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]{2,}$/;

const FALLBACK_REPLY_TO: ReplyToOption[] = [{ mode: 'NoReply', label: 'No reply' }];
/** Phones show about this many title characters (ADR-0007 D4). */
const PUSH_TITLE_VISIBLE = 65;

/**
 * Send Custom Message (ADR-0006 D8): recipients summary (live `resolve`), To / CC / BCC chips,
 * Reply-To, subject, rich-text body, attachments, "send a copy to me", Preview, Send and Cancel.
 * `?from=<id>` prefills subject and body from an earlier message (Duplicate).
 *
 * Push (ADR-0007 D1): an "Email | Push notification" switch at the top. Push uses the To chips only
 * (no typed addresses, CC/BCC kept but not sent), a Title + plain-text Message, "Send to my devices
 * too", a phone-card preview and `POST messages/push`. `?channel=push` opens on Push.
 */
@Component({
  selector: 'app-message-compose',
  imports: [FormsModule, RouterLink, ConfirmDialog, RecipientPicker, RichTextEditor],
  templateUrl: './compose.html',
})
export class MessageCompose {
  private readonly messages = inject(MessageService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly access = this.messages.access;
  readonly accessLoaded = signal(false);
  readonly formatBytes = formatBytes;
  readonly skipReasonLabel = skipReasonLabel;

  // ---- Form state ----
  readonly toChips = signal<PickerChip[]>([]);
  readonly ccChips = signal<PickerChip[]>([]);
  readonly bccChips = signal<PickerChip[]>([]);
  readonly replyMode = signal<ReplyToMode>('NoReply');
  readonly customReplyTo = signal('');
  readonly subject = signal('');
  readonly body = signal('');
  readonly files = signal<File[]>([]);
  readonly sendCopy = signal(false);
  readonly submitted = signal(false);
  readonly toTouched = signal(false);
  readonly fileError = signal('');
  readonly prefillNote = signal('');

  // ---- Channel (ADR-0007) ----
  readonly channel = signal<MessageChannel>('Email');
  readonly isPush = computed(() => this.channel() === 'Push');
  readonly pushAvailable = computed(() => !!this.access()?.pushAvailable);
  readonly pushReason = computed(() => (this.pushAvailable() ? '' : pushUnavailableText(this.access()?.pushUnavailableReason)));
  readonly channelNote = signal('');
  readonly pushTitle = signal('');
  readonly pushMessage = signal('');
  readonly pushCopy = signal(false);
  readonly pushTitleVisible = PUSH_TITLE_VISIBLE;
  readonly maxTitle = computed(() => this.access()?.pushMaxTitle || PUSH_MAX_TITLE);
  readonly maxMessage = computed(() => this.access()?.pushMaxMessage || PUSH_MAX_MESSAGE);
  readonly placeholders = ['{{FirstName}}', '{{FullName}}'];
  /** CC / BCC chips are kept while on Push (not sent) so switching back loses nothing. */
  readonly hiddenCopyChips = computed(() => this.ccChips().length + this.bccChips().length);
  readonly externalToChips = computed(() => this.toChips().filter((c) => c.type === 'External').length);

  // ---- Summary / dialogs ----
  readonly summary = signal<ResolveResult | null>(null);
  readonly toCount = computed(() => this.summary()?.to.count ?? 0);
  readonly ccCount = computed(() => this.summary()?.cc.count ?? 0);
  readonly bccCount = computed(() => this.summary()?.bcc.count ?? 0);
  readonly resolving = signal(false);
  readonly resolveError = signal('');
  readonly showAllSkipped = signal(false);
  readonly preview = signal<PreviewResult | null>(null);
  readonly previewDoc = signal<SafeHtml | null>(null);
  readonly previewing = signal(false);
  readonly confirmSend = signal(false);
  readonly confirmCancel = signal(false);
  readonly sending = signal(false);

  readonly allowExternal = computed(() => this.access()?.allowExternalAddresses ?? false);
  readonly replyOptions = computed<ReplyToOption[]>(() => {
    const o = this.access()?.replyToOptions;
    return o?.length ? o : FALLBACK_REPLY_TO;
  });
  readonly extensions = computed(() => {
    const list = this.access()?.allowedExtensions;
    return (list?.length ? list : DEFAULT_EXTENSIONS).map((e) => e.replace(/^\./, '').toLowerCase());
  });
  readonly acceptAttr = computed(() => this.extensions().map((e) => '.' + e).join(','));
  readonly formatsLabel = computed(() =>
    [...new Set(this.extensions().map((e) => (e === 'jpeg' ? 'jpg' : e)))].map((e) => e.toUpperCase()).join(', '),
  );
  readonly maxFileBytes = computed(() => this.access()?.maxFileBytes || DEFAULT_MAX_FILE);
  readonly maxTotalBytes = computed(() => this.access()?.maxTotalBytes || DEFAULT_MAX_TOTAL);
  readonly maxFiles = computed(() => this.access()?.maxFiles || DEFAULT_MAX_FILES);

  readonly filesBytes = computed(() => this.files().reduce((s, f) => s + f.size, 0));
  /** Data-URI images in the body count toward the per-message limit (server: inline attachments). */
  readonly inlineBytes = computed(() => inlineImageBytes(this.body()));
  readonly totalBytes = computed(() => this.filesBytes() + this.inlineBytes());

  readonly hasRecipients = computed(() => this.toChips().length + this.ccChips().length + this.bccChips().length > 0);

  // ---- Validation ----
  readonly toError = computed(() => (this.toChips().length ? '' : 'Add at least one recipient in To.'));
  readonly subjectError = computed(() => {
    const s = this.subject().trim();
    if (!s) return 'Subject is required.';
    if (s.length > 300) return 'Subject can be at most 300 characters.';
    return '';
  });
  readonly bodyError = computed(() => (this.body().trim() ? '' : 'Message is required.'));
  readonly replyError = computed(() => {
    if (this.replyMode() !== 'Custom') return '';
    const a = this.customReplyTo().trim();
    if (!a) return 'Enter the reply-to address.';
    return EMAIL_RE.test(a) ? '' : 'Enter a valid email address.';
  });
  readonly sizeError = computed(() =>
    this.totalBytes() > this.maxTotalBytes()
      ? `Attachments and images add up to ${formatBytes(this.totalBytes())}; the limit is ${formatBytes(this.maxTotalBytes())} per message.`
      : '',
  );

  // ---- Push validation ----
  readonly pushTitleError = computed(() => {
    const t = this.pushTitle().trim();
    if (!t) return 'Title is required.';
    if (t.length > this.maxTitle()) return `Title can be at most ${this.maxTitle()} characters.`;
    return '';
  });
  readonly pushMessageError = computed(() => {
    const m = this.pushMessage().trim();
    if (!m) return 'Message is required.';
    if (m.length > this.maxMessage()) return `Message can be at most ${this.maxMessage()} characters.`;
    return '';
  });

  readonly dirty = computed(
    () =>
      this.hasRecipients() ||
      !!this.subject().trim() ||
      !!this.body().trim() ||
      this.files().length > 0 ||
      !!this.pushTitle().trim() ||
      !!this.pushMessage().trim(),
  );

  private readonly resolveRequest = computed<ResolveRequest>(() =>
    this.isPush()
      ? {
          channel: 'Push',
          to: this.toChips().map(toApiChip),
          cc: [],
          bcc: [],
          sendCopyToSender: this.pushCopy(),
        }
      : {
          channel: 'Email',
          to: this.toChips().map(toApiChip),
          cc: this.ccChips().map(toApiChip),
          bcc: this.bccChips().map(toApiChip),
          sendCopyToSender: this.sendCopy(),
        },
  );

  constructor() {
    this.messages
      .loadAccess()
      .pipe(takeUntilDestroyed())
      .subscribe((a) => {
        this.accessLoaded.set(true);
        if (a?.replyToOptions?.length && !a.replyToOptions.some((o) => o.mode === this.replyMode())) {
          this.replyMode.set(a.replyToOptions[0].mode);
        }
        if (a?.canSend) {
          this.channelFromQuery();
          this.prefillFromQuery();
        }
      });

    // Live recipients summary: resolve 400 ms after the chips (or "copy to me") change.
    toObservable(this.resolveRequest)
      .pipe(
        debounceTime(400),
        switchMap((req) => {
          if (!req.to.length && !req.cc.length && !req.bcc.length) return of({ r: null, channel: req.channel });
          this.resolving.set(true);
          this.resolveError.set('');
          return this.messages.resolve(req).pipe(
            map((r): { r: ResolveResult | null; channel: MessageChannel | undefined } => ({ r, channel: req.channel })),
            catchError((err) => {
              this.resolveError.set(apiErrorLines(err, 'Could not count the recipients.').message);
              return of({ r: null, channel: req.channel });
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ r, channel }) => {
        this.resolving.set(false);
        // A late answer for the other channel (switched during the debounce) is dropped.
        if (channel !== this.channel()) return;
        this.summary.set(r);
      });
  }

  /** `?channel=push` opens the page on Push (when push can be used). */
  private channelFromQuery(): void {
    if ((this.route.snapshot.queryParamMap.get('channel') ?? '').toLowerCase() !== 'push') return;
    if (this.pushAvailable()) this.channel.set('Push');
    else this.channelNote.set(`Push notification isn’t available: ${this.pushReason()}`);
  }

  /** Duplicate: `?from=<id>` loads that message's subject, body and reply-to (Push: title and message). */
  private prefillFromQuery(): void {
    const from = Number(this.route.snapshot.queryParamMap.get('from'));
    if (!from) return;
    this.messages.detail(from, { recipientPageSize: 1 }).subscribe({
      next: (m) => {
        if (messageChannel(m) === 'Push') {
          // Plain text: never parsed as HTML.
          this.pushTitle.set(m.subject ?? '');
          this.pushMessage.set(m.bodyHtml ?? '');
          if (this.pushAvailable()) this.setChannel('Push');
          else this.channelNote.set(`Push notification isn’t available: ${this.pushReason()}`);
          this.prefillNote.set(`Copied from the push “${m.subject}”. Add the recipients again.`);
          return;
        }
        this.subject.set(m.subject);
        // Inline images were stored as cid: attachments of the old message — they cannot be resent.
        const { html, removed } = stripCidImages(m.bodyHtml ?? '');
        this.body.set(html);
        if (this.replyOptions().some((o) => o.mode === m.replyToMode)) {
          this.replyMode.set(m.replyToMode);
          if (m.replyToMode === 'Custom') this.customReplyTo.set(m.replyToAddress ?? '');
        }
        this.prefillNote.set(
          `Copied from “${m.subject}”. Add the recipients and attachments again` +
            (removed ? `; ${removed} embedded image${removed === 1 ? ' was' : 's were'} removed and must be inserted again.` : '.'),
        );
      },
      error: (err) => this.toast.error(apiErrorLines(err, 'Could not load the message to duplicate.').message),
    });
  }

  // ------------------------------------------------------------------ Channel

  /** Switches Email ⇄ Push. Chips and the text of both channels are kept. */
  setChannel(channel: MessageChannel): void {
    if (channel === this.channel()) return;
    if (channel === 'Push' && !this.pushAvailable()) {
      this.toast.error(this.pushReason());
      return;
    }
    this.channel.set(channel);
    this.channelNote.set('');
    // The other channel's summary has different counts — drop it until the new resolve arrives.
    this.summary.set(null);
    this.showAllSkipped.set(false);
    this.submitted.set(false);
  }

  /** Radio-group keyboard support for the segmented switch (← → Home End). */
  onChannelKey(event: KeyboardEvent, email: HTMLElement, push: HTMLElement): void {
    let next: MessageChannel | null = null;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'Home':
        next = 'Email';
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case 'End':
        next = 'Push';
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next === 'Push' && !this.pushAvailable()) {
      push.focus();
      return;
    }
    this.setChannel(next);
    (next === 'Push' ? push : email).focus();
  }

  /** Inserts `{{FirstName}}` / `{{FullName}}` at the cursor of the push message. */
  insertPlaceholder(textarea: HTMLTextAreaElement, token: string): void {
    const value = this.pushMessage();
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    if (next.length > this.maxMessage()) {
      this.toast.error(`The message can be at most ${this.maxMessage()} characters.`);
      return;
    }
    this.pushMessage.set(next);
    textarea.value = next;
    const caret = start + token.length;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
  }

  // ------------------------------------------------------------------ Reply-To

  replyLabel(o: ReplyToOption): string {
    return o.address && o.mode !== 'Custom' ? `${o.label} (${o.address})` : o.label;
  }

  private replyAddress(): string | null {
    return this.replyMode() === 'Custom' ? this.customReplyTo().trim() || null : null;
  }

  // ------------------------------------------------------------------ Attachments

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    input.value = '';
    this.addFiles(picked);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private addFiles(picked: File[]): void {
    const problems: string[] = [];
    const next = [...this.files()];
    for (const f of picked) {
      const ext = (f.name.split('.').pop() ?? '').toLowerCase();
      if (!f.name.includes('.') || !this.extensions().includes(ext)) {
        problems.push(`${f.name}: this file type is not allowed.`);
      } else if (f.size > this.maxFileBytes()) {
        problems.push(`${f.name}: larger than ${formatBytes(this.maxFileBytes())}.`);
      } else if (f.size === 0) {
        problems.push(`${f.name}: the file is empty.`);
      } else if (next.some((x) => x.name === f.name && x.size === f.size)) {
        problems.push(`${f.name}: already attached.`);
      } else if (next.length >= this.maxFiles()) {
        problems.push(`${f.name}: at most ${this.maxFiles()} files per message.`);
      } else if (next.reduce((s, x) => s + x.size, 0) + f.size + this.inlineBytes() > this.maxTotalBytes()) {
        problems.push(`${f.name}: the message would exceed ${formatBytes(this.maxTotalBytes())} in total.`);
      } else {
        next.push(f);
      }
    }
    this.files.set(next);
    this.fileError.set(problems.join(' '));
  }

  removeFile(index: number): void {
    this.files.update((fs) => fs.filter((_, i) => i !== index));
    this.fileError.set('');
  }

  fileIcon(name: string): string {
    const ext = (name.split('.').pop() ?? '').toLowerCase();
    if (ext === 'pdf') return 'text-red-600 bg-red-50';
    if (ext === 'doc' || ext === 'docx') return 'text-sky-700 bg-sky-50';
    if (ext === 'xlsx') return 'text-emerald-700 bg-emerald-50';
    return 'text-violet-700 bg-violet-50';
  }

  // ------------------------------------------------------------------ Preview

  openPreview(): void {
    this.submitted.set(true);
    if (this.isPush()) {
      this.openPushPreview();
      return;
    }
    if (this.subjectError() || this.bodyError() || this.replyError()) {
      this.toast.error('Fill in the subject and the message to preview it.');
      return;
    }
    this.previewing.set(true);
    this.messages
      .preview({
        subject: this.subject().trim(),
        html: this.body(),
        replyToMode: this.replyMode(),
        replyToAddress: this.replyAddress(),
        to: this.toChips().map(toApiChip),
      })
      .subscribe({
        next: (p) => {
          this.preview.set(p);
          // Server-sanitized HTML, shown in a sandbox="" iframe (no scripts, unique origin).
          this.previewDoc.set(this.sanitizer.bypassSecurityTrustHtml(emailDocument(p.html ?? '')));
          this.previewing.set(false);
        },
        error: (err) => {
          this.previewing.set(false);
          this.toast.error(apiErrorLines(err, 'Could not build the preview.').message);
        },
      });
  }

  /** Push preview: the server personalizes the text for the first To; shown as a phone card (text only). */
  private openPushPreview(): void {
    if (this.pushTitleError() || this.pushMessageError()) {
      this.toast.error('Fill in the title and the message to preview the push.');
      return;
    }
    this.previewing.set(true);
    this.messages
      .preview({
        channel: 'Push',
        subject: this.pushTitle().trim(),
        html: this.pushMessage().trim(),
        replyToMode: 'NoReply',
        replyToAddress: null,
        to: this.toChips().map(toApiChip),
      })
      .subscribe({
        next: (p) => {
          this.preview.set(p);
          this.previewDoc.set(null);
          this.previewing.set(false);
        },
        error: (err) => {
          this.previewing.set(false);
          this.toast.error(apiErrorLines(err, 'Could not build the preview.').message);
        },
      });
  }

  /** Push preview card text: the server's personalized text, else the typed message. */
  pushPreviewTitle(p: PreviewResult): string {
    return p.subject || this.pushTitle().trim();
  }

  pushPreviewText(p: PreviewResult): string {
    return p.text ?? this.pushMessage().trim();
  }

  closePreview(): void {
    this.preview.set(null);
    this.previewDoc.set(null);
  }

  // ------------------------------------------------------------------ Send

  /** Validates, refreshes the recipient count, then asks for confirmation. */
  requestSend(): void {
    this.submitted.set(true);
    this.toTouched.set(true);
    if (this.isPush()) {
      this.requestSendPush();
      return;
    }
    const problem = this.toError() || this.subjectError() || this.bodyError() || this.replyError() || this.sizeError();
    if (problem) {
      this.toast.error(problem);
      return;
    }
    this.resolving.set(true);
    this.messages.resolve(this.resolveRequest()).subscribe({
      next: (r) => {
        this.summary.set(r);
        this.resolving.set(false);
        if (r.overLimit) {
          this.toast.error(`This message has ${r.totalRecipients} recipients; the limit is ${r.maxRecipients}. Remove some recipients or groups.`);
        } else if (r.totalRecipients === 0 || r.to.count === 0) {
          this.toast.error('None of the To recipients can receive email. Check the skipped list in the summary.');
        } else {
          this.confirmSend.set(true);
        }
      },
      error: (err) => {
        this.resolving.set(false);
        this.toast.error(apiErrorLines(err, 'Could not count the recipients.').message);
      },
    });
  }

  private requestSendPush(): void {
    if (!this.pushAvailable()) {
      this.toast.error(this.pushReason());
      return;
    }
    const problem = this.toError() || this.pushTitleError() || this.pushMessageError();
    if (problem) {
      this.toast.error(problem);
      return;
    }
    this.resolving.set(true);
    this.messages.resolve(this.resolveRequest()).subscribe({
      next: (r) => {
        this.summary.set(r);
        this.resolving.set(false);
        if (r.overLimit) {
          this.toast.error(`This push has ${r.totalRecipients} recipients; the limit is ${r.maxRecipients}. Remove some recipients or groups.`);
        } else if (r.to.count === 0) {
          this.toast.error('None of the To recipients can receive a push. Check the skipped list in the summary.');
        } else {
          this.confirmSend.set(true);
        }
      },
      error: (err) => {
        this.resolving.set(false);
        this.toast.error(apiErrorLines(err, 'Could not count the recipients.').message);
      },
    });
  }

  /** "Send push to N people?" */
  confirmTitle(): string {
    if (!this.isPush()) return 'Send this message?';
    const n = this.summary()?.to.count ?? 0;
    return `Send push to ${n} ${n === 1 ? 'person' : 'people'}?`;
  }

  confirmMessage(): string {
    const s = this.summary();
    if (this.isPush()) {
      return 'Everyone gets it in their notification bell; people with the app on a phone also get a push. It can’t be recalled once sent.';
    }
    const emails = s?.totalEmails ?? 0;
    const people = s?.totalRecipients ?? 0;
    return `This will send ${emails} email${emails === 1 ? '' : 's'} to ${people} recipient${people === 1 ? '' : 's'}.`;
  }

  confirmDetails(): string[] {
    const s = this.summary();
    if (!s) return [];
    if (this.isPush()) {
      const lines = [`With the app on a phone: ${s.withApp ?? 0}`, `In app only (bell): ${s.inAppOnly ?? 0}`];
      if (s.self) lines.push('Also sent to your own devices');
      if (s.skipped.length) lines.push(`${s.skipped.length} recipient(s) will be skipped`);
      return lines;
    }
    const lines = [`To: ${s.to.count} (each gets their own email)`];
    if (s.cc.count) lines.push(`CC: ${s.cc.count} (one shared copy)`);
    if (s.bcc.count) lines.push(`BCC: ${s.bcc.count} (one hidden copy)`);
    if (s.self) lines.push(`A copy to you (${s.self.email})`);
    if (this.files().length) lines.push(`${this.files().length} attachment(s), ${formatBytes(this.filesBytes())}`);
    if (s.skipped.length) lines.push(`${s.skipped.length} address(es) will be skipped`);
    return lines;
  }

  send(): void {
    this.confirmSend.set(false);
    if (this.isPush()) {
      this.sendPush();
      return;
    }
    const request: SendMessageRequest = {
      subject: this.subject().trim(),
      html: this.body(),
      replyToMode: this.replyMode(),
      replyToAddress: this.replyAddress(),
      sendCopyToSender: this.sendCopy(),
      to: this.toChips().map(toApiChip),
      cc: this.ccChips().map(toApiChip),
      bcc: this.bccChips().map(toApiChip),
    };
    this.sending.set(true);
    this.messages.send(request, this.files()).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.toast.success(`Message queued for ${res.recipientCount} recipient${res.recipientCount === 1 ? '' : 's'}.`);
        if (res.deferredWarning) this.toast.show(res.deferredWarning, 'info', 8000);
        this.messages.loadAccess(true).subscribe();
        this.router.navigate(['/dashboard/messages', res.messageId]);
      },
      error: (err) => {
        this.sending.set(false);
        const { message, errors } = apiErrorLines(err, 'The message could not be sent.');
        this.toast.error([message, ...errors].filter(Boolean).join(' '));
      },
    });
  }

  private sendPush(): void {
    const request: SendPushRequest = {
      title: this.pushTitle().trim(),
      message: this.pushMessage().trim(),
      sendCopyToSender: this.pushCopy(),
      to: this.toChips().map(toApiChip),
    };
    this.sending.set(true);
    this.messages.sendPush(request).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.toast.success(`Push queued for ${res.recipientCount} ${res.recipientCount === 1 ? 'person' : 'people'}.`);
        this.messages.loadAccess(true).subscribe();
        this.router.navigate(['/dashboard/messages', res.messageId]);
      },
      error: (err) => {
        this.sending.set(false);
        const { message, errors } = apiErrorLines(err, 'The push notification could not be sent.');
        this.toast.error([message, ...errors].filter(Boolean).join(' '));
      },
    });
  }

  // ------------------------------------------------------------------ Cancel

  cancel(): void {
    if (this.dirty()) this.confirmCancel.set(true);
    else this.leave();
  }

  leave(): void {
    this.confirmCancel.set(false);
    this.router.navigate([this.access()?.canView ? '/dashboard/messages' : '/dashboard']);
  }

  editorNotice(message: string): void {
    this.toast.error(message);
  }
}

/** Approximate decoded size of the data-URI images in an HTML string. */
function inlineImageBytes(html: string): number {
  let total = 0;
  const re = /src=["']data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) total += Math.floor((m[1].length * 3) / 4);
  return total;
}

/** Removes <img src="cid:…"> (inline images of a sent message cannot be reused). */
function stripCidImages(html: string): { html: string; removed: number } {
  let removed = 0;
  const out = html.replace(/<img\b[^>]*\bsrc=["']cid:[^"']*["'][^>]*>/gi, () => {
    removed++;
    return '';
  });
  return { html: out, removed };
}
