/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import { ClearinghouseSettings, UpdateClearinghouseRequest } from '../../../../core/models/billing.model';
import { BillingSettingsService } from '../../../../core/services/billing-settings.service';
import { ToastService } from '../../../../core/services/toast.service';

type Form = Omit<UpdateClearinghouseRequest, 'sftpSecret' | 'clearSftpSecret' | 'fileNamePattern'> & {
  fileNamePattern: string;
};

const blank = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

/** Settings ▸ Billing ▸ Clearinghouse (837P submitter / receiver, transport, SFTP). */
@Component({
  selector: 'app-clearinghouse-card',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="wp-card mt-6">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 class="text-base font-bold text-slate-900">Clearinghouse</h2>
          <p class="mt-1 text-sm text-slate-500">
            Where electronic claims (837P) go and acknowledgements / remittances (999, 277CA, 835) come from.
            Test with usage <b>T</b>, then switch to <b>P</b> (production).
          </p>
        </div>
        @if (data(); as d) {
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [class]="d.usageIndicator === 'P' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
            {{ d.usageIndicator === 'P' ? 'Production' : 'Test' }}
          </span>
        }
      </div>

      @if (error()) {
        <div class="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ error() }}
          @if (errors().length) {
            <ul class="mt-1 list-disc pl-5 text-xs">@for (e of errors(); track $index) { <li>{{ e }}</li> }</ul>
          }
        </div>
      }

      @if (loading()) {
        <p class="py-8 text-center text-sm text-slate-400">Loading…</p>
      } @else if (form(); as f) {
        <fieldset [disabled]="!canEdit()">
          <h3 class="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Submitter &amp; receiver</h3>
          <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label class="wp-label">Clearinghouse name</label>
              <input class="wp-input" maxlength="100" [ngModel]="f.name" (ngModelChange)="patch({ name: $event })" />
            </div>
            <div>
              <label class="wp-label">Submitter id (ISA06 / 1000A)</label>
              <input class="wp-input" maxlength="15" [ngModel]="f.submitterId" (ngModelChange)="patch({ submitterId: $event })" />
            </div>
            <div>
              <label class="wp-label">Submitter name</label>
              <input class="wp-input" maxlength="60" [ngModel]="f.submitterName" (ngModelChange)="patch({ submitterName: $event })" />
            </div>
            <div>
              <label class="wp-label">Contact name</label>
              <input class="wp-input" maxlength="60" [ngModel]="f.contactName" (ngModelChange)="patch({ contactName: $event })" />
            </div>
            <div>
              <label class="wp-label">Contact phone</label>
              <input class="wp-input" maxlength="20" [ngModel]="f.contactPhone" (ngModelChange)="patch({ contactPhone: $event })" />
            </div>
            <div>
              <label class="wp-label">Contact email</label>
              <input type="email" class="wp-input" maxlength="100" [ngModel]="f.contactEmail" (ngModelChange)="patch({ contactEmail: $event })" />
            </div>
            <div>
              <label class="wp-label">Receiver id (ISA08 / 1000B)</label>
              <input class="wp-input" maxlength="15" [ngModel]="f.receiverId" (ngModelChange)="patch({ receiverId: $event })" />
            </div>
            <div>
              <label class="wp-label">Receiver name</label>
              <input class="wp-input" maxlength="60" [ngModel]="f.receiverName" (ngModelChange)="patch({ receiverName: $event })" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="wp-label">ISA sender qual.</label>
                <input class="wp-input uppercase" maxlength="2" [ngModel]="f.isaSenderQualifier" (ngModelChange)="patch({ isaSenderQualifier: $event })" />
              </div>
              <div>
                <label class="wp-label">ISA receiver qual.</label>
                <input class="wp-input uppercase" maxlength="2" [ngModel]="f.isaReceiverQualifier" (ngModelChange)="patch({ isaReceiverQualifier: $event })" />
              </div>
            </div>
            <div>
              <label class="wp-label">Usage indicator</label>
              <select class="wp-input" [ngModel]="f.usageIndicator" (ngModelChange)="patch({ usageIndicator: $event })">
                <option value="T">T — Test</option>
                <option value="P">P — Production</option>
              </select>
            </div>
            <div>
              <label class="wp-label">File name pattern</label>
              <input class="wp-input font-mono text-xs" maxlength="100" [ngModel]="f.fileNamePattern" (ngModelChange)="patch({ fileNamePattern: $event })" placeholder="{agency}_{date}_{ctrl}.837" />
              <p class="mt-1 text-[11px] text-slate-400">Tokens: {{ '{' }}agency{{ '}' }}, {{ '{' }}date{{ '}' }}, {{ '{' }}time{{ '}' }}, {{ '{' }}ctrl{{ '}' }}. Empty keeps the current pattern.</p>
            </div>
            <div>
              <label class="wp-label">Next interchange control #</label>
              <input class="wp-input bg-slate-50" [value]="data()?.nextInterchangeControl ?? ''" disabled />
            </div>
          </div>

          <h3 class="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">Transport</h3>
          <div class="mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-sm font-semibold">
            <button type="button" (click)="patch({ transport: 'Download' })" class="rounded-lg px-4 py-1.5 transition"
              [class]="f.transport === 'Download' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-800'">Download files</button>
            <button type="button" (click)="patch({ transport: 'Sftp' })" class="rounded-lg px-4 py-1.5 transition"
              [class]="f.transport === 'Sftp' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-800'">SFTP</button>
          </div>
          <p class="mt-1 text-xs text-slate-500">
            @if (f.transport === 'Sftp') { Batches are uploaded automatically; inbound files can be polled every few minutes. }
            @else { You download each batch file and upload it to the clearinghouse yourself; upload 999 / 277CA / 835 files on the Remittances tab. }
          </p>

          @if (f.transport === 'Sftp') {
            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label class="wp-label">SFTP host</label>
                <input class="wp-input" maxlength="200" [ngModel]="f.sftpHost" (ngModelChange)="patch({ sftpHost: $event })" placeholder="sftp.example.com" />
              </div>
              <div>
                <label class="wp-label">Port</label>
                <input type="number" min="1" max="65535" class="wp-input" [ngModel]="f.sftpPort" (ngModelChange)="patch({ sftpPort: $event })" />
              </div>
              <div>
                <label class="wp-label">User</label>
                <input class="wp-input" maxlength="100" autocomplete="off" [ngModel]="f.sftpUser" (ngModelChange)="patch({ sftpUser: $event })" />
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <label class="wp-label">Host key fingerprint *</label>
                <input class="wp-input font-mono text-xs" maxlength="200" [ngModel]="f.sftpHostKeyFingerprint" (ngModelChange)="patch({ sftpHostKeyFingerprint: $event })" placeholder="SHA256:…" />
                <p class="mt-1 text-[11px]" [class]="f.sftpHostKeyFingerprint ? 'text-slate-400' : 'text-amber-700'">
                  Required before SFTP can connect: the server's SSH host-key fingerprint (e.g. <span class="font-mono">SHA256:…</span>) from your clearinghouse.
                  Connections to a server with a different key are refused.
                </p>
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <label class="wp-label">
                  Password or private key
                  @if (data()?.hasSftpSecret) {
                    <span class="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Set</span>
                  } @else {
                    <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Not set</span>
                  }
                </label>
                @if (editingSecret()) {
                  <textarea rows="3" class="wp-input font-mono text-xs" autocomplete="off" [ngModel]="secret()" (ngModelChange)="secret.set($event)"
                    placeholder="Password, or a PEM / OpenSSH private key (-----BEGIN …)"></textarea>
                  <button type="button" (click)="editingSecret.set(false); secret.set('')" class="mt-1 text-xs font-semibold text-slate-500 hover:text-slate-800">Keep the current one</button>
                } @else {
                  <div class="flex flex-wrap items-center gap-3">
                    <button type="button" (click)="editingSecret.set(true); clearSecret.set(false)" class="wp-btn-ghost !py-1.5 !px-3 text-xs">{{ data()?.hasSftpSecret ? 'Replace' : 'Set' }}</button>
                    @if (data()?.hasSftpSecret) {
                      <label class="flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" [ngModel]="clearSecret()" (ngModelChange)="clearSecret.set($event)" class="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                        Remove the stored secret on save
                      </label>
                    }
                  </div>
                }
                <p class="mt-1 text-[11px] text-slate-400">Stored encrypted and never shown again.</p>
              </div>
              <div>
                <label class="wp-label">Outbound folder</label>
                <input class="wp-input" maxlength="200" [ngModel]="f.sftpOutbound" (ngModelChange)="patch({ sftpOutbound: $event })" placeholder="/inbound" />
              </div>
              <div>
                <label class="wp-label">Inbound folder</label>
                <input class="wp-input" maxlength="200" [ngModel]="f.sftpInbound" (ngModelChange)="patch({ sftpInbound: $event })" placeholder="/outbound" />
              </div>
              <label class="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                <input type="checkbox" [ngModel]="f.pollInbound" (ngModelChange)="patch({ pollInbound: $event })" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Poll inbound files automatically
              </label>
            </div>
          }
        </fieldset>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span class="text-xs text-slate-400">{{ data()?.updatedOn ? 'Last saved ' + (data()!.updatedOn | date: 'MMM d, y h:mm a') : '' }}</span>
          @if (canEdit()) {
            <button type="button" (click)="save()" [disabled]="saving()" class="wp-btn-primary">{{ saving() ? 'Saving…' : 'Save clearinghouse' }}</button>
          }
        </div>
      }
    </div>
  `,
})
export class ClearinghouseCard {
  private readonly service = inject(BillingSettingsService);
  private readonly toast = inject(ToastService);

  readonly canEdit = input(false);

  readonly data = signal<ClearinghouseSettings | null>(null);
  readonly form = signal<Form | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly errors = signal<string[]>([]);
  readonly editingSecret = signal(false);
  readonly secret = signal('');
  readonly clearSecret = signal(false);

  constructor() {
    this.service.clearinghouse().subscribe({
      next: (d) => {
        this.apply(d);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the clearinghouse settings.');
        this.loading.set(false);
      },
    });
  }

  private apply(d: ClearinghouseSettings): void {
    this.data.set(d);
    this.form.set({
      name: d.name,
      submitterId: d.submitterId,
      submitterName: d.submitterName,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      contactEmail: d.contactEmail,
      receiverId: d.receiverId,
      receiverName: d.receiverName,
      isaSenderQualifier: d.isaSenderQualifier || 'ZZ',
      isaReceiverQualifier: d.isaReceiverQualifier || 'ZZ',
      usageIndicator: d.usageIndicator || 'T',
      transport: d.transport || 'Download',
      sftpHost: d.sftpHost,
      sftpPort: d.sftpPort || 22,
      sftpUser: d.sftpUser,
      sftpHostKeyFingerprint: d.sftpHostKeyFingerprint ?? null,
      sftpOutbound: d.sftpOutbound,
      sftpInbound: d.sftpInbound,
      fileNamePattern: d.fileNamePattern ?? '',
      pollInbound: d.pollInbound,
    });
    this.editingSecret.set(false);
    this.secret.set('');
    this.clearSecret.set(false);
  }

  patch(p: Partial<Form>): void {
    if (!this.canEdit()) return;
    this.form.update((f) => (f ? { ...f, ...p } : f));
  }

  save(): void {
    const f = this.form();
    if (!f) return;
    this.error.set('');
    this.errors.set([]);
    if (f.transport === 'Sftp' && !blank(f.sftpHost)) {
      this.error.set('Enter the SFTP host.');
      return;
    }
    const request: UpdateClearinghouseRequest = {
      name: blank(f.name),
      submitterId: blank(f.submitterId),
      submitterName: blank(f.submitterName),
      contactName: blank(f.contactName),
      contactPhone: blank(f.contactPhone),
      contactEmail: blank(f.contactEmail),
      receiverId: blank(f.receiverId),
      receiverName: blank(f.receiverName),
      isaSenderQualifier: (blank(f.isaSenderQualifier) ?? 'ZZ').toUpperCase(),
      isaReceiverQualifier: (blank(f.isaReceiverQualifier) ?? 'ZZ').toUpperCase(),
      usageIndicator: f.usageIndicator,
      transport: f.transport,
      sftpHost: blank(f.sftpHost),
      sftpPort: Number(f.sftpPort) || 22,
      sftpUser: blank(f.sftpUser),
      sftpSecret: this.editingSecret() && this.secret().trim() ? this.secret() : null,
      clearSftpSecret: !this.editingSecret() && this.clearSecret(),
      sftpHostKeyFingerprint: blank(f.sftpHostKeyFingerprint),
      sftpOutbound: blank(f.sftpOutbound),
      sftpInbound: blank(f.sftpInbound),
      fileNamePattern: blank(f.fileNamePattern),
      pollInbound: f.pollInbound,
    };
    this.saving.set(true);
    this.service.updateClearinghouse(request).subscribe({
      next: (d) => {
        this.saving.set(false);
        this.apply(d);
        this.toast.success('Clearinghouse settings saved.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const e = apiErrorLines(err, 'Could not save the clearinghouse settings.');
        this.error.set(e.message || 'Could not save the clearinghouse settings.');
        this.errors.set(e.errors);
      },
    });
  }
}
