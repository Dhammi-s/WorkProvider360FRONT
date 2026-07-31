/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject, signal } from '@angular/core';
import { SchedulerService } from './scheduler.service';

/**
 * Captures the device GPS position and posts it to the API roughly every
 * 15 seconds WHILE the user is clocked in on a schedule. The browser prompts
 * for location permission on first use. Tracking stops on clock-out.
 */
@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  private readonly scheduler = inject(SchedulerService);

  /** The schedule currently being tracked, or null. */
  readonly tracking = signal<number | null>(null);
  readonly error = signal('');

  private watchId: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private last: GeolocationCoordinates | null = null;

  private static readonly INTERVAL_MS = 15_000;

  isTracking(scheduleId: number): boolean {
    return this.tracking() === scheduleId;
  }

  start(scheduleId: number): void {
    if (this.tracking() === scheduleId) return;
    this.stop();

    if (!('geolocation' in navigator)) {
      this.error.set('This device does not support location sharing.');
      return;
    }

    this.error.set('');
    this.tracking.set(scheduleId);

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.last = pos.coords;
      },
      (err) => {
        this.error.set(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — sharing is off.'
            : 'Could not read your location.',
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    // Post the freshest fix on a fixed cadence.
    this.timer = setInterval(() => this.push(scheduleId), LocationTrackingService.INTERVAL_MS);
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.last = null;
    this.tracking.set(null);
  }

  private push(scheduleId: number): void {
    if (this.tracking() !== scheduleId || !this.last) return;
    this.scheduler
      .recordLocation(scheduleId, {
        latitude: Number(this.last.latitude.toFixed(6)),
        longitude: Number(this.last.longitude.toFixed(6)),
        accuracyMeters: this.last.accuracy != null ? Math.round(this.last.accuracy) : null,
      })
      .subscribe({
        next: () => this.error.set(''),
        error: (err: Error) => {
          // If we're no longer clocked in, the server rejects — stop cleanly.
          if ((err.message || '').toLowerCase().includes('clocked in')) {
            this.stop();
          } else {
            this.error.set(err.message || 'Could not send location.');
          }
        },
      });
  }
}
