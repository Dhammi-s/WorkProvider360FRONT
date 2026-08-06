/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEFAULT_LOGIN_CONTENT, LoginContent } from '../../../core/models/login-content.model';
import { BrandingService } from '../../../core/services/branding.service';
import { PwaService } from '../../../core/services/pwa.service';

/**
 * Split-screen auth layout: a branded gradient panel on the left (hidden on
 * small screens) and a projected form card on the right. The left panel's
 * content (agency name, logo, headline, stats, testimonial) is loaded from the
 * public login endpoint and is editable by a SuperAdmin.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  private readonly branding = inject(BrandingService);
  private readonly pwa = inject(PwaService);

  readonly agencyName = signal('WorkProvider360');
  readonly logo = signal<string | null>(null);
  readonly content = signal<LoginContent>(DEFAULT_LOGIN_CONTENT);

  readonly stats = computed(() => {
    const c = this.content();
    return [
      { label: c.stat1Label, value: c.stat1Value },
      { label: c.stat2Label, value: c.stat2Value },
      { label: c.stat3Label, value: c.stat3Value },
    ].filter((s) => s.label || s.value);
  });

  readonly quoteInitials = computed(() =>
    (this.content().quoteAuthor || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || 'A',
  );

  constructor() {
    this.branding.getLoginPage().subscribe({
      next: (page) => {
        if (!page) return;
        if (page.agencyName) this.agencyName.set(page.agencyName);
        this.logo.set(page.logo ?? null);
        if (page.content) this.content.set(page.content);
        // White-label the installable app with this agency's name + logo.
        this.pwa.applyManifest(this.agencyName(), page.logo);
      },
      error: () => {},
    });
  }
}
