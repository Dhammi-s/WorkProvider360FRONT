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

/** SuperAdmin: upload / replace / remove the banner placed at the top of every email the agency sends. */
@Component({
  selector: 'app-email-banner-uploader',
  imports: [ImageCropperComponent, Alert],
  templateUrl: './email-banner-uploader.html',
})
export class EmailBannerUploader {
  private readonly branding = inject(BrandingService);

  readonly currentBanner = this.branding.emailBanner;

  readonly fileEvent = signal<Event | null>(null);
  readonly cropped = signal<string | null>(null);
  readonly saving = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  constructor() {
    // Make sure the current banner is loaded even if the sidebar hasn't triggered it yet.
    this.branding.load();
  }

  onFileSelected(event: Event): void {
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
  }

  save(): void {
    const data = this.cropped();
    if (!data) return;
    this.submit(data, 'Email banner updated.');
  }

  remove(): void {
    this.submit(null, 'Email banner removed.');
  }

  private submit(data: string | null, successMsg: string): void {
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    this.branding.updateEmailBanner(data).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set(successMsg);
        this.fileEvent.set(null);
        this.cropped.set(null);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Could not save the banner.');
      },
    });
  }
}
