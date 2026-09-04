/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CareLogEntry } from '../../../core/models/scheduler.model';

/**
 * Renders a shift's care log as a chronological timeline: clock-in/out (with an
 * optional map pin), notes and injury reports, and captured client signatures
 * shown as images. Read-only; reused in the scheduler and the client profile.
 */
@Component({
  selector: 'app-care-log',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (entries().length === 0) {
      <p class="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-400">No care-log events for this shift yet.</p>
    } @else {
      <ol class="space-y-3">
        @for (e of entries(); track $index) {
          <li class="flex gap-3">
            <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  [class]="badge(e.type)">{{ icon(e.type) }}</span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline justify-between gap-x-2">
                <span class="text-sm font-semibold text-slate-800">{{ title(e.type) }}</span>
                <span class="text-xs text-slate-400">{{ e.timestampUtc | date: 'MMM d, h:mm a' }}</span>
              </div>
              @if (e.actorName) { <div class="text-xs text-slate-500">{{ e.actorName }}</div> }
              @if (e.message) { <p class="mt-1 whitespace-pre-line text-sm text-slate-600">{{ e.message }}</p> }
              @if (e.source && (e.type === 'ClockIn' || e.type === 'ClockOut')) {
                <span class="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{{ e.source }}</span>
              }
              @if (e.latitude != null && e.longitude != null) {
                <a class="ml-2 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                   target="_blank" rel="noopener"
                   [href]="'https://www.google.com/maps?q=' + e.latitude + ',' + e.longitude">View location</a>
              }
              @if (e.type === 'Signature' && e.signatureBase64) {
                <img [src]="'data:image/png;base64,' + e.signatureBase64" alt="signature"
                     class="mt-2 h-24 rounded-lg border border-slate-200 bg-white" />
                @if (e.signedByName) { <div class="mt-1 text-xs text-slate-500">Signed by {{ e.signedByName }} ({{ e.phase }})</div> }
              }
            </div>
          </li>
        }
      </ol>
    }
  `,
})
export class CareLog {
  readonly entries = input<CareLogEntry[]>([]);

  badge(type: string): string {
    switch (type) {
      case 'ClockIn': return 'bg-emerald-100 text-emerald-700';
      case 'ClockOut': return 'bg-sky-100 text-sky-700';
      case 'Injury': return 'bg-red-100 text-red-700';
      case 'Signature': return 'bg-brand-100 text-brand-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  icon(type: string): string {
    switch (type) {
      case 'ClockIn': return 'IN';
      case 'ClockOut': return 'OUT';
      case 'Injury': return '!';
      case 'Signature': return '✎';
      default: return '•';
    }
  }

  title(type: string): string {
    switch (type) {
      case 'ClockIn': return 'Clock-in';
      case 'ClockOut': return 'Clock-out';
      case 'Injury': return 'Injury report';
      case 'Signature': return 'Client signature';
      default: return 'Note';
    }
  }
}
