import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('client');

  /** Live browser connectivity — drives the full-screen "no internet" page. */
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.online.set(true));
      window.addEventListener('offline', () => this.online.set(false));
    }
  }

  /** Re-check the connection; if it's back, reload so the app refetches fresh data. */
  retry(): void {
    if (typeof navigator === 'undefined') return;
    this.online.set(navigator.onLine);
    if (navigator.onLine && typeof location !== 'undefined') location.reload();
  }
}
