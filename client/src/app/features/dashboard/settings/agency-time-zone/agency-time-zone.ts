/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Timezone } from '../../../../core/models/office.model';
import { OfficeService } from '../../../../core/services/office.service';
import { ToastService } from '../../../../core/services/toast.service';
import { groupTimezones } from '../../../../core/utils/timezones';
import { Alert } from '../../../../shared/ui/alert/alert';

/**
 * Settings → Company Profile (SuperAdmin): the agency time zone used for the times in emails,
 * push notifications and SMS (ADR-0008). Not set → each office's own zone, else UTC.
 */
@Component({
  selector: 'app-agency-time-zone',
  imports: [FormsModule, Alert],
  templateUrl: './agency-time-zone.html',
})
export class AgencyTimeZoneCard {
  private readonly offices = inject(OfficeService);
  private readonly toast = inject(ToastService);

  readonly timezones = signal<Timezone[]>([]);
  /** Value saved on the server (null = not set). */
  readonly savedId = signal<string | null>(null);
  /** Value chosen in the select (null = not set). */
  readonly selectedId = signal<string | null>(null);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly selected = computed(() => {
    const id = this.selectedId();
    return id ? this.timezones().find((t) => t.timezoneId === id) ?? null : null;
  });

  /** Picker groups: named zones, then fixed GMT offsets — each sorted by offset (ADR-0009). */
  readonly groups = computed(() => groupTimezones(this.timezones()));

  readonly dirty = computed(() => this.selectedId() !== this.savedId());

  /** The saved zone was archived / deactivated, so the server ignores it. */
  readonly savedInactive = computed(() => {
    const id = this.savedId();
    return !this.loading() && !!id && !this.timezones().some((t) => t.timezoneId === id);
  });

  /** Abbreviation for the example line; without one, the offset the API prints (e.g. "UTC+03:30"). */
  readonly exampleLabel = computed(() => {
    const tz = this.selected();
    if (!tz) return null;
    if (tz.standardAbbreviation) return tz.standardAbbreviation;
    // The descriptions start with the standard offset, e.g. "(UTC+03:30) Tehran" or "(UTC) Coordinated…".
    const offset = /^\(UTC([+-]\d{2}:\d{2})?\)/.exec(tz.description ?? '');
    return offset ? `UTC${offset[1] ?? ''}` : tz.timezoneName;
  });

  constructor() {
    forkJoin({ zones: this.offices.timezones(), current: this.offices.getAgencyTimeZone() }).subscribe({
      next: ({ zones, current }) => {
        this.timezones.set(zones);
        this.savedId.set(current.timezoneId ?? null);
        this.selectedId.set(current.timezoneId ?? null);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message || 'Could not load the agency time zone.');
      },
    });
  }

  label(tz: Timezone): string {
    const name = tz.description || tz.timezoneName;
    const abbr = [tz.standardAbbreviation, tz.daylightAbbreviation].filter((a) => !!a);
    const unique = abbr.filter((a, i) => abbr.indexOf(a) === i);
    return unique.length ? `${name} (${unique.join(' / ')})` : name;
  }

  save(): void {
    if (!this.dirty() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.offices.setAgencyTimeZone(this.selectedId()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.savedId.set(res.timezoneId ?? null);
        this.selectedId.set(res.timezoneId ?? null);
        this.toast.success('Agency time zone saved.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Could not save the agency time zone.');
      },
    });
  }
}
