/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-08-04
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { PwaService } from '../../../core/services/pwa.service';

/**
 * "Install app" call-to-action shown on the login page for phones/tablets only.
 * Android/Chromium gets a one-tap install button; iOS Safari (no install API)
 * gets Add-to-Home-Screen instructions. Hidden entirely on desktop or when the
 * app is already running installed (standalone).
 */
@Component({
  selector: 'app-install-prompt',
  template: `
    @if (visible()) {
      <div class="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
        <div class="flex items-center gap-3">
          <img src="icons/icon.svg" alt="" class="h-10 w-10 rounded-xl shadow-sm" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-slate-900">Install this app</p>
            <p class="text-xs text-slate-500">Add it to your home screen for a full-screen, app-like experience.</p>
          </div>
          @if (canInstall()) {
            <button type="button" (click)="install()" class="wp-btn-primary shrink-0 !px-4 !py-2 text-sm">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" /></svg>
              Install
            </button>
          } @else if (isIos()) {
            <button type="button" (click)="showIosHelp.set(!showIosHelp())" class="wp-btn-ghost shrink-0 !px-3 !py-2 text-sm">
              How?
            </button>
          }
        </div>

        @if (isIos() && showIosHelp()) {
          <ol class="mt-3 space-y-1.5 border-t border-brand-100 pt-3 text-xs text-slate-600">
            <li class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">1</span>
              Tap the <strong>Share</strong> icon
              <svg class="h-4 w-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0L8 8m4-4l4 4M6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6" /></svg>
              in your browser bar.
            </li>
            <li class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">2</span>
              Choose <strong>Add to Home Screen</strong>.
            </li>
            <li class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">3</span>
              Tap <strong>Add</strong> — done!
            </li>
          </ol>
        }
      </div>
    }
  `,
})
export class InstallPrompt {
  private readonly pwa = inject(PwaService);

  readonly canInstall = this.pwa.canInstall;
  readonly isIos = this.pwa.isIos;
  readonly showIosHelp = signal(false);

  /** Only for phones/tablets, not already installed, and either installable or iOS. */
  readonly visible = computed(
    () => this.pwa.isMobile() && !this.pwa.isStandalone() && (this.pwa.canInstall() || this.pwa.isIos()),
  );

  install(): void {
    void this.pwa.promptInstall();
  }
}
