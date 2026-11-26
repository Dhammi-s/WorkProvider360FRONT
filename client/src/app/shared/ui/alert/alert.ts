/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, effect, inject, input } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

export type AlertType = 'error' | 'success' | 'info';

/** Banner for info messages. Success (green) and error (red) messages are shown as toasts instead. */
@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
})
export class Alert {
  readonly type = input<AlertType>('info');
  readonly message = input<string>('');
  private readonly toast = inject(ToastService);

  constructor() {
    effect(() => {
      const m = this.message();
      const t = this.type();
      if (m && t === 'success') this.toast.success(m);
      else if (m && t === 'error') this.toast.error(m);
    });
  }

  get classes(): string {
    switch (this.type()) {
      case 'error':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      default:
        return 'border-brand-200 bg-brand-50 text-brand-700';
    }
  }
}
