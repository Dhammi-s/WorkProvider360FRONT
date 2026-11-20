/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { CalendarFeed } from '../../../../core/models/calendar-feed.model';
import { CalendarFeedService } from '../../../../core/services/calendar-feed.service';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

/** My profile → "Calendar feed": a private .ics link for Google / Apple / Outlook calendars. */
@Component({
  selector: 'app-calendar-feed-card',
  imports: [DatePipe, Alert, ConfirmDialog],
  template: `
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-bold text-slate-900">Calendar feed</h2>
        <p class="mt-1 text-sm text-slate-500">See your visits in Google, Apple or Outlook calendar. The feed shows the last 2 weeks and the next 90 days and refreshes on the calendar app's schedule.</p>
      </div>
      @if (feed(); as f) {
        <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" [class]="f.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">{{ f.enabled ? 'On' : 'Off' }}</span>
      }
    </div>
    <app-alert type="error" [message]="error()" />

    @if (feed(); as f) {
      @if (f.enabled) {
        <p class="mt-3 text-xs text-slate-500">
          Created {{ f.createdOn ? (f.createdOn | date: 'MMM d, y') : '—' }} ·
          last used by a calendar {{ f.lastAccessOn ? (f.lastAccessOn | date: 'MMM d, y, h:mm a') : 'never' }}
        </p>
      }

      @if (newUrl()) {
        <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p class="text-xs font-semibold text-amber-800">Copy this link now: for your privacy it is shown only once.</p>
          <div class="mt-2 flex gap-2">
            <input class="wp-input !py-1.5 font-mono text-xs" [value]="newUrl()" readonly (focus)="$any($event.target).select()" />
            <button type="button" (click)="copy()" class="wp-btn-primary shrink-0 !py-1.5 !px-3 text-xs">{{ copied() ? 'Copied' : 'Copy' }}</button>
          </div>
          <p class="mt-2 text-[11px] text-amber-800">Anyone with the link can see your visits. If it leaks, regenerate it.</p>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-3">
          <div class="rounded-xl bg-slate-50 p-3"><p class="font-bold text-slate-800">Google Calendar</p><p class="mt-1">On a computer: Other calendars → + → From URL → paste the link → Add calendar.</p></div>
          <div class="rounded-xl bg-slate-50 p-3"><p class="font-bold text-slate-800">Apple Calendar</p><p class="mt-1">iPhone: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar. Mac: File → New Calendar Subscription.</p></div>
          <div class="rounded-xl bg-slate-50 p-3"><p class="font-bold text-slate-800">Outlook</p><p class="mt-1">Calendar → Add calendar → Subscribe from web → paste the link → Import.</p></div>
        </div>
      }

      <div class="mt-4 flex flex-wrap gap-2">
        @if (f.enabled) {
          <button type="button" (click)="confirm.set('regenerate')" [disabled]="busy()" class="wp-btn-ghost">Regenerate link</button>
          <button type="button" (click)="confirm.set('off')" [disabled]="busy()" class="wp-btn-ghost !text-red-600">Turn off</button>
        } @else {
          <button type="button" (click)="regenerate()" [disabled]="busy()" class="wp-btn-primary">{{ busy() ? 'Creating…' : 'Create link' }}</button>
        }
      </div>
    } @else if (!error()) {
      <p class="mt-3 text-sm text-slate-400">Loading…</p>
    }

    @if (confirm() === 'regenerate') {
      <app-confirm-dialog title="Regenerate the calendar link?" message="The current link stops working. You will need to subscribe again with the new link in every calendar app."
        confirmLabel="Regenerate" (confirmed)="regenerate()" (cancelled)="confirm.set(null)" />
    }
    @if (confirm() === 'off') {
      <app-confirm-dialog tone="danger" title="Turn off the calendar feed?" message="The link stops working and your calendar apps will no longer receive your visits."
        confirmLabel="Turn off" (confirmed)="turnOff()" (cancelled)="confirm.set(null)" />
    }
  `,
})
export class CalendarFeedCard {
  private readonly service = inject(CalendarFeedService);

  readonly feed = signal<CalendarFeed | null>(null);
  /** The link, only right after create / regenerate. */
  readonly newUrl = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly copied = signal(false);
  readonly confirm = signal<'regenerate' | 'off' | null>(null);

  constructor() {
    this.service.get().subscribe({
      next: (f) => this.feed.set(f),
      error: (err: Error) => this.error.set(err.message || 'Could not load the calendar feed.'),
    });
  }

  regenerate(): void {
    this.confirm.set(null);
    this.busy.set(true);
    this.error.set('');
    this.copied.set(false);
    this.service.regenerate().subscribe({
      next: (f) => {
        this.busy.set(false);
        this.feed.set({ ...f, enabled: true });
        this.newUrl.set(f.url);
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message || 'Could not create the link.');
      },
    });
  }

  turnOff(): void {
    this.confirm.set(null);
    this.busy.set(true);
    this.error.set('');
    this.service.turnOff().subscribe({
      next: () => {
        this.busy.set(false);
        this.newUrl.set(null);
        this.feed.set({ enabled: false, url: null, createdOn: null, lastAccessOn: null });
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message || 'Could not turn off the feed.');
      },
    });
  }

  copy(): void {
    const url = this.newUrl();
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => this.copied.set(true),
      () => this.error.set('Could not copy. Select the link and copy it by hand.'),
    );
  }
}
