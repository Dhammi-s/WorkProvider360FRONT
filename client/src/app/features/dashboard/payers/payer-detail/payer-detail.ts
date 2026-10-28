/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientAccess } from '../../../../core/models/client.model';
import { Office } from '../../../../core/models/office.model';
import {
  Payer,
  PayerContact,
  PayerLinkedClient,
  SavePayerRequest,
  distributionLabel,
  payerTypeLabel,
  rankLabel,
} from '../../../../core/models/payer.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientService } from '../../../../core/services/client.service';
import { OfficeService } from '../../../../core/services/office.service';
import { PayerService } from '../../../../core/services/payer.service';
import { Alert } from '../../../../shared/ui/alert/alert';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PayerForm } from '../../../../shared/ui/payer-form/payer-form';

type Tab = 'details' | 'contacts' | 'clients';

interface ContactForm {
  contactId: number | null;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  email: string;
}

const emptyContact = (): ContactForm => ({ contactId: null, firstName: '', lastName: '', jobTitle: '', phone: '', email: '' });

/** Add a payer (/payers/new) or view / edit one: details, contacts and linked clients. */
@Component({
  selector: 'app-payer-detail',
  imports: [DatePipe, FormsModule, RouterLink, Alert, ConfirmDialog, PayerForm],
  templateUrl: './payer-detail.html',
})
export class PayerDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(PayerService);
  private readonly clients = inject(ClientService);
  private readonly officeService = inject(OfficeService);
  private readonly auth = inject(AuthService);

  readonly payerId = signal<number | null>(null);
  readonly isNew = computed(() => this.payerId() == null);
  readonly access = signal<ClientAccess | null>(null);
  readonly canManage = computed(() => !!this.access()?.canManage);
  readonly offices = signal<Office[]>([]);

  readonly payer = signal<Payer | null>(null);
  readonly contacts = signal<PayerContact[]>([]);
  readonly linked = signal<PayerLinkedClient[]>([]);
  readonly linkedLoaded = signal(false);
  readonly tab = signal<Tab>('details');

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly notice = signal('');
  readonly error = signal('');
  readonly confirmStatus = signal(false);

  readonly contactForm = signal<ContactForm | null>(null);
  readonly contactBusy = signal(false);

  readonly typeLabel = payerTypeLabel;
  readonly rankLabel = rankLabel;
  readonly distributionLabel = distributionLabel;

  constructor() {
    this.clients.access().subscribe({ next: (a) => this.access.set(a), error: () => {} });
    if (this.auth.roleName() === 'SuperAdmin') {
      this.officeService.list().subscribe({ next: (o) => this.offices.set(o.filter((x) => x.isActive)), error: () => {} });
    }
    this.route.paramMap.subscribe((pm) => {
      const raw = pm.get('id');
      const id = raw && raw !== 'new' ? Number(raw) : null;
      this.payerId.set(Number.isInteger(id) && id! > 0 ? id : null);
      this.tab.set('details');
      this.linkedLoaded.set(false);
      if (this.payerId()) this.load();
      else {
        this.payer.set(null);
        this.contacts.set([]);
      }
    });
  }

  load(): void {
    const id = this.payerId();
    if (!id) return;
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (d) => {
        this.payer.set(d.payer);
        this.contacts.set(d.contacts);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the payer.');
        this.loading.set(false);
      },
    });
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    if (t === 'clients' && !this.linkedLoaded() && this.payerId()) {
      this.service.linkedClients(this.payerId()!).subscribe({
        next: (l) => {
          this.linked.set(l);
          this.linkedLoaded.set(true);
        },
        error: (err: Error) => this.error.set(err.message || 'Could not load linked clients.'),
      });
    }
  }

  save(request: SavePayerRequest): void {
    this.saving.set(true);
    this.notice.set('');
    this.error.set('');
    const id = this.payerId();
    const req$ = id ? this.service.update(id, request) : this.service.create(request);
    req$.subscribe({
      next: (d) => {
        this.saving.set(false);
        this.payer.set(d.payer);
        this.contacts.set(d.contacts);
        if (!id) {
          this.router.navigate(['/dashboard/payers', d.payer.payerId], { replaceUrl: true });
        }
        this.notice.set(id ? 'Payer saved.' : 'Payer created. You can now add contacts or link it to clients.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Could not save the payer.');
      },
    });
  }

  toggleStatus(): void {
    const p = this.payer();
    if (!p) return;
    this.confirmStatus.set(false);
    this.service.setStatus(p.payerId, p.status === 'Active' ? 'Inactive' : 'Active').subscribe({
      next: (d) => {
        this.payer.set(d.payer);
        this.notice.set(`Payer marked ${d.payer.status.toLowerCase()}.`);
      },
      error: (err: Error) => this.error.set(err.message || 'Could not change the status.'),
    });
  }

  // ------------------------------------------------------------ Contacts

  editContact(c: PayerContact | null): void {
    this.contactForm.set(
      c
        ? { contactId: c.contactId, firstName: c.firstName, lastName: c.lastName ?? '', jobTitle: c.jobTitle ?? '', phone: c.phone ?? '', email: c.email ?? '' }
        : emptyContact(),
    );
  }

  patchContact(p: Partial<ContactForm>): void {
    this.contactForm.update((f) => (f ? { ...f, ...p } : f));
  }

  saveContact(): void {
    const f = this.contactForm();
    const id = this.payerId();
    if (!f || !id) return;
    if (!f.firstName.trim()) {
      this.error.set('Contact first name is required.');
      return;
    }
    this.contactBusy.set(true);
    this.error.set('');
    this.service
      .saveContact(id, f.contactId, {
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim() || null,
        jobTitle: f.jobTitle.trim() || null,
        phone: f.phone.trim() || null,
        email: f.email.trim() || null,
      })
      .subscribe({
        next: (list) => {
          this.contacts.set(list);
          this.contactForm.set(null);
          this.contactBusy.set(false);
        },
        error: (err: Error) => {
          this.contactBusy.set(false);
          this.error.set(err.message || 'Could not save the contact.');
        },
      });
  }

  deleteContact(c: PayerContact): void {
    const id = this.payerId();
    if (!id) return;
    this.service.deleteContact(id, c.contactId).subscribe({
      next: (list) => this.contacts.set(list),
      error: (err: Error) => this.error.set(err.message || 'Could not remove the contact.'),
    });
  }
}
