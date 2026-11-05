import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ComplianceInfo,
  ComplianceReportType,
  ComplianceService,
  ComplianceSettings,
  EvvVisit,
} from '../../../core/services/compliance.service';
import { AuthService } from '../../../core/services/auth.service';
import { Alert } from '../../../shared/ui/alert/alert';

type Tab = 'visits' | 'reports' | 'settings';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Country-driven compliance: US shows EVV (visits + third-party submission); every country gets reports. */
@Component({
  selector: 'app-compliance',
  imports: [FormsModule, DatePipe, DecimalPipe, Alert],
  templateUrl: './compliance.html',
})
export class Compliance {
  private readonly api = inject(ComplianceService);
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');

  readonly info = signal<ComplianceInfo | null>(null);
  readonly tab = signal<Tab>('visits');

  readonly from = signal(isoDate(new Date(Date.now() - 30 * 86400000)));
  readonly to = signal(isoDate(new Date()));

  readonly visits = signal<EvvVisit[]>([]);
  readonly loading = signal(false);
  readonly selected = signal<Set<number>>(new Set());
  readonly submitting = signal(false);
  readonly downloading = signal<ComplianceReportType | null>(null);

  readonly notice = signal('');
  readonly error = signal('');

  // Settings form
  readonly settings = signal<ComplianceSettings | null>(null);
  readonly form = signal({ isEnabled: false, providerKey: 'Generic', stateCode: '', endpointUrl: '', accountId: '', apiKey: '' });
  readonly savingSettings = signal(false);

  readonly submissionAvailable = computed(() => this.info()?.submissionAvailable ?? false);
  readonly selectableIds = computed(() => this.visits().filter((v) => v.clockOutUtc).map((v) => v.timeEntryId));
  readonly allSelected = computed(() => this.selectableIds().length > 0 && this.selectableIds().every((id) => this.selected().has(id)));

  constructor() {
    this.api.info().subscribe({
      next: (i) => {
        this.info.set(i);
        // Non-US countries have no submission yet, so land on Reports.
        if (!i.submissionAvailable) this.tab.set('reports');
        else this.loadVisits();
        if (this.isSuperAdmin() && i.submissionAvailable) this.loadSettings();
      },
      error: (e: Error) => this.error.set(e.message || 'Could not load compliance information.'),
    });
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    this.notice.set('');
    this.error.set('');
  }

  loadVisits(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.visits(this.from(), this.to()).subscribe({
      next: (v) => {
        this.visits.set(v);
        this.selected.set(new Set());
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message || 'Could not load visits.');
      },
    });
  }

  toggle(id: number, checked: boolean): void {
    const next = new Set(this.selected());
    checked ? next.add(id) : next.delete(id);
    this.selected.set(next);
  }

  toggleAll(checked: boolean): void {
    this.selected.set(checked ? new Set(this.selectableIds()) : new Set());
  }

  submitSelected(): void {
    const ids = [...this.selected()];
    if (!ids.length) return;
    this.submitting.set(true);
    this.error.set('');
    this.api.submit(ids).subscribe({
      next: ({ results, message }) => {
        this.submitting.set(false);
        const failed = results.filter((r) => !r.success);
        if (failed.length) this.error.set(`${message} First error: ${failed[0].message}`);
        else this.notice.set(message);
        this.loadVisits();
      },
      error: (e: Error) => {
        this.submitting.set(false);
        this.error.set(e.message || 'Submission failed.');
      },
    });
  }

  download(type: ComplianceReportType): void {
    this.downloading.set(type);
    this.error.set('');
    this.api.downloadReport(type, this.from(), this.to()).subscribe({
      next: () => this.downloading.set(null),
      error: (e: Error) => {
        this.downloading.set(null);
        this.error.set(e.message || 'Could not download the report.');
      },
    });
  }

  private loadSettings(): void {
    this.api.settings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.form.set({
          isEnabled: s.isEnabled,
          providerKey: s.providerKey || 'Generic',
          stateCode: s.stateCode ?? '',
          endpointUrl: s.endpointUrl ?? '',
          accountId: s.accountId ?? '',
          apiKey: '',
        });
      },
      error: () => {},
    });
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  saveSettings(): void {
    const f = this.form();
    this.savingSettings.set(true);
    this.error.set('');
    this.api
      .saveSettings({
        isEnabled: f.isEnabled,
        providerKey: f.providerKey,
        stateCode: f.stateCode || null,
        endpointUrl: f.endpointUrl || null,
        accountId: f.accountId || null,
        apiKey: f.apiKey || null,
      })
      .subscribe({
        next: (s) => {
          this.savingSettings.set(false);
          this.settings.set(s);
          this.patch('apiKey', '');
          this.notice.set('Compliance settings saved.');
        },
        error: (e: Error) => {
          this.savingSettings.set(false);
          this.error.set(e.message || 'Could not save settings.');
        },
      });
  }
}
