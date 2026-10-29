/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-29
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject } from '@angular/core';
import { TenantStatusService } from '../../core/services/tenant-status.service';

/**
 * Full-screen page shown when this domain isn't linked to an agency in the
 * master database yet (instead of a small "tenant not resolved" error on login).
 */
@Component({
  selector: 'app-not-connected-page',
  template: `
    <div class="flex min-h-screen items-center justify-center bg-brand-panel px-6 py-12">
      <div class="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-10 wp-anim-pop">
        <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1M3 3l18 18" />
          </svg>
        </span>
        <h1 class="mt-6 text-2xl font-black tracking-tight text-slate-900">This site isn't connected yet</h1>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          The address <span class="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">{{ status.host }}</span>
          hasn't been linked to an agency on WorkProvider360 yet.
        </p>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          Please contact the <strong>WorkProvider360 team</strong> and we'll get your agency connected.
        </p>

        <a [href]="mailto()" class="wp-btn-primary mx-auto mt-7 inline-flex">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4zM4 6l8 7 8-7" /></svg>
          Contact the WorkProvider360 team
        </a>
        <div class="mt-3 text-sm text-slate-500">
          or email <a [href]="mailto()" class="wp-link">{{ status.supportEmail() }}</a>
        </div>

        <button type="button" (click)="retry()" class="mt-6 text-xs font-semibold text-slate-400 hover:text-slate-600">Already connected? Try again</button>
        <p class="mt-8 text-[11px] text-slate-400">Powered by WorkProvider360</p>
      </div>
    </div>
  `,
})
export class NotConnectedPage {
  readonly status = inject(TenantStatusService);

  readonly mailto = computed(() => {
    const subject = encodeURIComponent(`Connect ${this.status.host} to WorkProvider360`);
    const body = encodeURIComponent(`Hello WorkProvider360 team,\n\nPlease connect our site ${this.status.host} to our agency.\n\nAgency name:\nContact phone:\n`);
    return `mailto:${this.status.supportEmail()}?subject=${subject}&body=${body}`;
  });

  retry(): void {
    location.reload();
  }
}
