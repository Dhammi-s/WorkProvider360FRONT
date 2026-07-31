import { Component, computed, inject, signal } from '@angular/core';
import { DEFAULT_LOGIN_CONTENT, LoginContent } from '../../../core/models/login-content.model';
import { BrandingService } from '../../../core/services/branding.service';

/**
 * Split-screen auth layout: a branded gradient panel on the left (hidden on
 * small screens) and a projected form card on the right. The left panel's
 * content (agency name, logo, headline, stats, testimonial) is loaded from the
 * public login endpoint and is editable by a SuperAdmin.
 */
@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  private readonly branding = inject(BrandingService);

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
      },
      error: () => {},
    });
  }
}
