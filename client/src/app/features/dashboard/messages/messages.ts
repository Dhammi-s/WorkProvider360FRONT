/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { apiErrorLines } from '../../../core/models/api-response.model';
import {
  MESSAGE_CHANNELS,
  MESSAGE_STATUSES,
  MessageChannel,
  MessageListItem,
  MessageStatus,
  messageChannel,
  messageStatusClass,
  messageStatusLabel,
  utc,
} from '../../../core/models/message.model';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from '../../../core/services/message.service';
import { Paginator } from '../../../shared/ui/paginator/paginator';

/** Sent messages (ADR-0006 D8): list with channel / status / date / search filters and "Mine only".
 *  ADR-0007: Channel column (email / push) and filter. */
@Component({
  selector: 'app-messages',
  imports: [DatePipe, FormsModule, RouterLink, Paginator],
  templateUrl: './messages.html',
})
export class Messages {
  private readonly messages = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly access = this.messages.access;
  readonly accessLoaded = signal(false);
  readonly statuses = MESSAGE_STATUSES;
  readonly channels = MESSAGE_CHANNELS;
  readonly channelOf = messageChannel;
  readonly statusLabel = messageStatusLabel;
  readonly statusClass = messageStatusClass;
  readonly utc = utc;
  /** Users only ever see their own messages, so the toggle is for SuperAdmin / Admin / Manager. */
  readonly showMineToggle = computed(() => this.auth.roleName() !== 'User');

  readonly items = signal<MessageListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly status = signal<MessageStatus | ''>('');
  readonly channel = signal<MessageChannel | ''>('');
  readonly from = signal('');
  readonly to = signal('');
  readonly search = signal('');
  readonly mine = signal(false);

  private readonly search$ = new Subject<void>();

  constructor() {
    this.messages
      .loadAccess()
      .pipe(takeUntilDestroyed())
      .subscribe((a) => {
        this.accessLoaded.set(true);
        if (a?.canView) this.load();
      });
    this.search$.pipe(debounceTime(350), takeUntilDestroyed()).subscribe(() => this.applyFilters());
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.messages
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        status: this.status() || null,
        from: this.from() || null,
        to: this.to() || null,
        search: this.search() || null,
        mine: this.mine(),
        channel: this.channel() || null,
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.items ?? []);
          this.total.set(r.totalCount ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiErrorLines(err, 'Could not load the messages.').message);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.search$.next();
  }

  clearFilters(): void {
    this.status.set('');
    this.channel.set('');
    this.from.set('');
    this.to.set('');
    this.search.set('');
    this.mine.set(false);
    this.applyFilters();
  }

  readonly hasFilters = computed(() => !!(this.status() || this.channel() || this.from() || this.to() || this.search() || this.mine()));

  goPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.applyFilters();
  }

  open(m: MessageListItem): void {
    this.router.navigate(['/dashboard/messages', m.messageId]);
  }
}
