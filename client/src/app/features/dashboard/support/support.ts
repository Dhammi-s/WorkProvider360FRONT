/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SupportService } from '../../../core/services/support.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Support page: contact channels + a message form that emails the support inbox via the backend. */
@Component({
  selector: 'app-support',
  imports: [RouterLink, Alert],
  templateUrl: './support.html',
})
export class Support {
  private readonly auth = inject(AuthService);
  private readonly support = inject(SupportService);

  readonly supportEmail = 'workprovider360com@gmail.com';
  readonly user = this.auth.user;

  readonly subject = signal('');
  readonly message = signal('');
  readonly sending = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  readonly canSend = computed(() => this.subject().trim().length > 0 && this.message().trim().length > 0);

  send(): void {
    if (!this.canSend()) return;
    this.sending.set(true);
    this.notice.set('');
    this.error.set('');
    this.support.send(this.subject().trim(), this.message().trim()).subscribe({
      next: (msg) => {
        this.sending.set(false);
        this.notice.set(msg);
        this.subject.set('');
        this.message.set('');
      },
      error: (err: Error) => {
        this.sending.set(false);
        this.error.set(err.message || 'Could not send your message. Please try again.');
      },
    });
  }
}
