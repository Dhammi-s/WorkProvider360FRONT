/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { BrandingService } from '../../../core/services/branding.service';
import { Alert } from '../../../shared/ui/alert/alert';

/**
 * SuperAdmin agency-logo uploader: pick a file → crop (square) → save as a
 * base64 data URI. The saved logo is shared via BrandingService so the sidebar
 * updates immediately.
 */
@Component({
  selector: 'app-logo-uploader',
  imports: [ImageCropperComponent, Alert],
  templateUrl: './logo-uploader.html',
})
export class LogoUploader {
  private readonly branding = inject(BrandingService);

  readonly currentLogo = this.branding.logo;

  readonly fileEvent = signal<Event | null>(null);
  readonly cropped = signal<string | null>(null);
  readonly saving = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  onFileSelected(event: Event): void {
    this.notice.set('');
    this.error.set('');
    this.cropped.set(null);
    this.fileEvent.set(event);
  }

  onCropped(event: ImageCroppedEvent): void {
    this.cropped.set(event.base64 ?? null);
  }

  onLoadFailed(): void {
    this.error.set('That image could not be loaded. Try a PNG or JPG.');
  }

  cancel(): void {
    this.fileEvent.set(null);
    this.cropped.set(null);
    this.error.set('');
  }

  save(): void {
    const data = this.cropped();
    if (!data) return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    this.branding.updateLogo(data).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set('Logo updated.');
        this.fileEvent.set(null);
        this.cropped.set(null);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Could not save the logo.');
      },
    });
  }
}
