/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-08-04
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, isDevMode, signal } from '@angular/core';

/** The `beforeinstallprompt` event isn't in the standard TS lib yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Progressive-Web-App glue: registers the service worker, captures the install
 * prompt, exposes device/standalone state to the UI, and rewrites the manifest
 * at runtime so each agency's installed app shows ITS OWN name + logo.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  /** Android/Chromium fired `beforeinstallprompt` — we can show a one-tap install. */
  readonly canInstall = signal(false);
  /** Running as an installed app (standalone display mode). */
  readonly isStandalone = signal(this.detectStandalone());
  /** Rough device checks used to decide whether to surface the install option. */
  readonly isMobile = signal(this.detectMobile());
  readonly isIos = signal(this.detectIos());

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private started = false;

  /** Called once at app start. Registers the SW and wires install events. */
  init(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Stop Chrome's mini-infobar; we present our own button instead.
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isStandalone.set(true);
    });

    // Register the service worker only for production builds — in dev it would
    // cache aggressively and fight the live-reload server.
    if (!isDevMode() && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {
          /* SW is a progressive enhancement; ignore registration failures. */
        });
      });
    }
  }

  /** Show the native install dialog (Android/Chromium). Returns true if accepted. */
  async promptInstall(): Promise<boolean> {
    const evt = this.deferredPrompt;
    if (!evt) return false;
    await evt.prompt();
    const choice = await evt.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
    return choice.outcome === 'accepted';
  }

  /**
   * Replace the linked manifest with a per-agency one so the installed app is
   * white-labeled (name + icon). Called after the public branding loads.
   */
  applyManifest(agencyName: string, logo?: string | null): void {
    if (typeof document === 'undefined') return;
    const name = (agencyName || 'WorkProvider360').trim();

    const manifest = {
      name,
      short_name: name.length > 12 ? name.slice(0, 12) : name,
      description: `${name} — field-service & workforce management.`,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#0f766e',
      icons: this.buildIcons(logo),
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const url = URL.createObjectURL(blob);

    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    } else if (link.dataset['blob'] === 'true') {
      // Revoke the previous blob URL before swapping in a new one.
      URL.revokeObjectURL(link.href);
    }
    link.href = url;
    link.dataset['blob'] = 'true';

    // iOS uses this meta (not the manifest) for the home-screen label.
    const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = name;
  }

  /** Agency logo first (when usable), then the bundled default so install always has a valid icon. */
  private buildIcons(logo?: string | null): Array<{ src: string; sizes: string; type?: string; purpose?: string }> {
    const icons: Array<{ src: string; sizes: string; type?: string; purpose?: string }> = [];

    if (logo && /^https?:\/\//i.test(logo)) {
      // Cloudinary URLs can be resized on the fly for crisp 192/512 tiles.
      const at = (w: number) =>
        logo.includes('/upload/')
          ? logo.replace('/upload/', `/upload/w_${w},h_${w},c_pad,b_white/`)
          : logo;
      icons.push({ src: at(192), sizes: '192x192', type: 'image/png', purpose: 'any' });
      icons.push({ src: at(512), sizes: '512x512', type: 'image/png', purpose: 'any' });
    } else if (logo && logo.startsWith('data:image')) {
      icons.push({ src: logo, sizes: '512x512', purpose: 'any' });
    }

    // Always-present fallback (same-origin, guarantees installability).
    icons.push({ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' });
    return icons;
  }

  private detectStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }

  private detectMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
  }

  private detectIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const iOS = /iPhone|iPad|iPod/i.test(ua);
    // iPadOS 13+ reports as Mac; detect by touch support.
    const iPadOS = /Macintosh/i.test(ua) && 'ontouchend' in document;
    return iOS || iPadOS;
  }
}
