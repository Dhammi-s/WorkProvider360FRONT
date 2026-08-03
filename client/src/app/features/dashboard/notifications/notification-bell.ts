/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-08-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { AppNotification, NotificationService } from '../../../core/services/notification.service';

/** Top-bar notification bell: unread badge + dropdown list of in-app notifications. */
@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  templateUrl: './notification-bell.html',
})
export class NotificationBell implements OnDestroy {
  private readonly service = inject(NotificationService);

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly unread = signal(0);
  readonly items = signal<AppNotification[]>([]);

  private readonly poll: ReturnType<typeof setInterval>;

  constructor() {
    this.refreshCount();
    // Light polling so new notifications surface without a page reload.
    this.poll = setInterval(() => this.refreshCount(), 60_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.poll);
  }

  private refreshCount(): void {
    this.service.unreadCount().subscribe({ next: (n) => this.unread.set(n), error: () => {} });
  }

  toggle(): void {
    const opening = !this.open();
    this.open.set(opening);
    if (opening) this.load();
  }

  close(): void {
    this.open.set(false);
  }

  private load(): void {
    this.loading.set(true);
    this.service.mine().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
        // Opening the bell marks everything read.
        if (this.unread() > 0) {
          this.service.markAllRead().subscribe({ next: () => this.unread.set(0), error: () => {} });
        }
      },
      error: () => this.loading.set(false),
    });
  }
}
