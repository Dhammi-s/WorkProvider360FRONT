/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-08-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { AppNotification, NotificationService } from '../../../core/services/notification.service';

/** Top-bar notification bell: unread badge + dropdown list of in-app notifications.
 *  Clicking an item marks it read (`POST notifications/{id}/read`) and expands long text;
 *  "Mark all read" clears the rest. Custom pushes (ADR-0007) show who sent them. */
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
  readonly expanded = signal<number | null>(null);
  readonly markingAll = signal(false);
  readonly anyUnread = computed(() => this.unread() > 0 || this.items().some((n) => !n.isRead));

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
        this.refreshCount();
      },
      error: () => this.loading.set(false),
    });
  }

  /** Click on an item: mark it read (once) and expand / collapse its text. */
  select(n: AppNotification): void {
    this.expanded.set(this.expanded() === n.notificationId ? null : n.notificationId);
    if (n.isRead) return;
    this.setRead(n.notificationId);
    this.unread.update((c) => Math.max(0, c - 1));
    this.service.markRead(n.notificationId).subscribe({
      // Resync the badge with the server either way (a failed call leaves it unread there).
      next: () => this.refreshCount(),
      error: () => {
        this.setRead(n.notificationId, false);
        this.refreshCount();
      },
    });
  }

  markAllRead(): void {
    if (this.markingAll()) return;
    this.markingAll.set(true);
    this.service.markAllRead().subscribe({
      next: () => {
        this.markingAll.set(false);
        this.unread.set(0);
        this.items.update((list) => list.map((n) => (n.isRead ? n : { ...n, isRead: true })));
      },
      error: () => this.markingAll.set(false),
    });
  }

  private setRead(id: number, isRead = true): void {
    this.items.update((list) => list.map((n) => (n.notificationId === id ? { ...n, isRead } : n)));
  }

  /** Custom push messages carry the sender ("From Ann Smith"). */
  isCustomPush(n: AppNotification): boolean {
    return n.customMessageId != null;
  }
}
