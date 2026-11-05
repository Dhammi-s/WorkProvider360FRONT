/* WorkProvider360 - Multi-tenant SaaS platform. Do NOT change without discussing with the software engineer. */

import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

/** Fixed top-right toast stack. Rendered once in the app root. */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
})
export class Toast {
  readonly svc = inject(ToastService);

  classes(type: string): string {
    switch (type) {
      case 'error': return 'border-red-200 bg-white text-red-700';
      case 'success': return 'border-emerald-200 bg-white text-emerald-700';
      default: return 'border-brand-200 bg-white text-brand-700';
    }
  }
}
