import { Component, input } from '@angular/core';

export type AlertType = 'error' | 'success' | 'info';

/** Small inline banner for form-level success / error / info messages. */
@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
})
export class Alert {
  readonly type = input<AlertType>('info');
  readonly message = input<string>('');

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
