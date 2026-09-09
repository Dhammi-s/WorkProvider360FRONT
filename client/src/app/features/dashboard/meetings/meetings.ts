/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-09
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MeetingService } from '../../../core/services/meeting.service';
import { UserService } from '../../../core/services/user.service';
import { ClientService } from '../../../core/services/client.service';
import { Alert } from '../../../shared/ui/alert/alert';
import {
  Meeting,
  MeetingDetail,
  MeetingParticipant,
  MeetingPayment,
  MeetingPaymentSummary,
  MeetingAccess,
  MeetingType,
  MeetingStatus,
  ParticipantRole,
  ParticipantStatus,
  PaymentMethod,
  PaymentStatus,
  CreateMeetingRequest,
  UpdateMeetingRequest,
} from '../../../core/models/meeting.model';
import { UserDto } from '../../../core/models/user.model';
import { Client } from '../../../core/models/client.model';

type ViewTab = 'list' | 'calendar';
type ModalMode = 'create' | 'edit' | 'detail' | 'payment';

const COLOR_OPTIONS = [
  { label: 'Indigo',  value: '#6366f1', cls: 'bg-indigo-500'  },
  { label: 'Emerald', value: '#10b981', cls: 'bg-emerald-500' },
  { label: 'Amber',   value: '#f59e0b', cls: 'bg-amber-500'   },
  { label: 'Rose',    value: '#f43f5e', cls: 'bg-rose-500'    },
  { label: 'Sky',     value: '#0ea5e9', cls: 'bg-sky-500'     },
  { label: 'Violet',  value: '#8b5cf6', cls: 'bg-violet-500'  },
];

@Component({
  selector: 'app-meetings',
  imports: [FormsModule, DatePipe, CurrencyPipe, Alert],
  templateUrl: './meetings.html',
})
export class Meetings {
  private readonly svc    = inject(MeetingService);
  private readonly auth   = inject(AuthService);
  private readonly users  = inject(UserService);
  private readonly client = inject(ClientService);

  readonly user       = this.auth.user;
  readonly roleName   = this.auth.roleName;
  readonly isSuperAdmin = computed(() => this.roleName() === 'SuperAdmin');
  readonly isAdmin      = computed(() => this.roleName() === 'Admin' || this.isSuperAdmin());
  readonly isManager    = computed(() => this.roleName() === 'Manager' || this.isAdmin());

  // ---- access + data ----
  readonly access    = signal<MeetingAccess | null>(null);
  readonly meetings  = signal<Meeting[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal('');

  // ---- filter state ----
  readonly viewTab       = signal<ViewTab>('list');
  readonly filterStatus  = signal<string>('');
  readonly filterFrom    = signal<string>('');
  readonly filterTo      = signal<string>('');

  // ---- modal ----
  readonly modalOpen  = signal(false);
  readonly modalMode  = signal<ModalMode>('create');
  readonly modalBusy  = signal(false);
  readonly modalError = signal('');
  readonly modalNotice = signal('');

  // ---- form state (create / edit) ----
  readonly form = signal<CreateMeetingRequest>({
    title: '',
    description: '',
    startUtc: '',
    endUtc: '',
    location: '',
    meetingType: 'InPerson',
    isPaid: false,
    feePerParticipant: null,
    maxParticipants: null,
    notes: '',
    colorTag: null,
    participantUserIds: [],
    participantClientIds: [],
  });
  editingId = 0;

  // ---- detail panel ----
  readonly detail    = signal<MeetingDetail | null>(null);
  readonly detailLoading = signal(false);

  // ---- participants ----
  readonly addPartMode   = signal<'user' | 'client'>('user');
  readonly addPartUserId = signal<number | null>(null);
  readonly addPartClientId = signal<number | null>(null);
  readonly addPartRole   = signal<ParticipantRole>('Attendee');
  readonly partBusy      = signal(false);
  readonly partError     = signal('');

  // ---- user/client lists for participant picker ----
  readonly userList   = signal<UserDto[]>([]);
  readonly clientList = signal<Client[]>([]);

  // ---- RSVP ----
  readonly rsvpBusy   = signal(false);

  // ---- payments ----
  readonly payments         = signal<MeetingPayment[]>([]);
  readonly paymentSummary   = signal<MeetingPaymentSummary | null>(null);
  readonly paymentMeetingId = signal(0);
  readonly payForm = signal<{ participantId: number; amount: number; method: PaymentMethod; status: PaymentStatus; transactionId: string; notes: string }>({
    participantId: 0, amount: 0, method: 'Cash', status: 'Paid', transactionId: '', notes: '',
  });
  readonly payBusy  = signal(false);
  readonly payError = signal('');
  readonly payNotice = signal('');

  // ---- calendar ----
  readonly calAnchor = signal(new Date());
  readonly calMonthDays = computed(() => this.buildCalDays(this.calAnchor()));

  // ---- lookup helpers ----
  readonly colorOptions = COLOR_OPTIONS;
  readonly meetingTypes: MeetingType[]     = ['InPerson', 'Online', 'Hybrid'];
  readonly statusOptions: MeetingStatus[]  = ['Scheduled', 'InProgress', 'Completed', 'Cancelled'];
  readonly participantRoles: ParticipantRole[] = ['Attendee', 'Optional'];
  readonly payMethods: PaymentMethod[] = ['Cash', 'Online'];
  readonly payStatuses: PaymentStatus[] = ['Paid', 'Pending', 'Refunded'];

  constructor() {
    this.loadAccess();
  }

  // ================================================================ Loading

  loadAccess(): void {
    this.svc.getAccess().subscribe({
      next: (a) => {
        this.access.set(a);
        if (a.access !== 'None') {
          this.load();
          this.loadUserList();
          this.loadClientList();
        } else {
          this.loading.set(false);
        }
      },
      error: (e: Error) => {
        this.error.set(e.message || 'Could not load access.');
        this.loading.set(false);
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.svc.list(
      this.filterFrom() || undefined,
      this.filterTo()   || undefined,
      this.filterStatus() || undefined,
    ).subscribe({
      next: (m) => { this.meetings.set(m); this.loading.set(false); },
      error: (e: Error) => { this.error.set(e.message || 'Could not load meetings.'); this.loading.set(false); },
    });
  }

  loadUserList(): void {
    this.users.getUsers().subscribe({ next: (u) => this.userList.set(u), error: () => {} });
  }

  loadClientList(): void {
    this.client.list().subscribe({ next: (r) => this.clientList.set(r.items), error: () => {} });
  }

  // ================================================================ Computed

  readonly filtered = computed(() => {
    const s = this.filterStatus();
    return s ? this.meetings().filter((m) => m.status === s) : this.meetings();
  });

  readonly canCreate = computed(() => this.access()?.canCreate ?? false);
  readonly canEdit   = computed(() => this.access()?.canEdit   ?? false);
  readonly canDelete = computed(() => this.access()?.canDelete ?? false);
  readonly canPay    = computed(() => this.access()?.canManagePayments ?? false);

  statusBadge(s: MeetingStatus | string): string {
    switch (s) {
      case 'Scheduled':   return 'bg-blue-100 text-blue-700';
      case 'InProgress':  return 'bg-amber-100 text-amber-700';
      case 'Completed':   return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled':   return 'bg-rose-100 text-rose-700';
      default:            return 'bg-slate-100 text-slate-600';
    }
  }

  typeBadge(t: MeetingType | string): string {
    switch (t) {
      case 'Online':  return 'bg-sky-100 text-sky-700';
      case 'Hybrid':  return 'bg-violet-100 text-violet-700';
      default:        return 'bg-slate-100 text-slate-600';
    }
  }

  rsvpBadge(s: string): string {
    switch (s) {
      case 'Accepted':  return 'bg-emerald-100 text-emerald-700';
      case 'Declined':  return 'bg-rose-100 text-rose-700';
      case 'Tentative': return 'bg-amber-100 text-amber-700';
      default:          return 'bg-slate-100 text-slate-500';
    }
  }

  displayName(p: MeetingParticipant): string {
    return p.participantName ?? p.clientName ?? '—';
  }

  // ================================================================ Create / Edit

  openCreate(): void {
    const now   = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    this.form.set({
      title: '', description: '', startUtc: this.toDatetimeLocal(now),
      endUtc: this.toDatetimeLocal(later), location: '', meetingType: 'InPerson',
      isPaid: false, feePerParticipant: null, maxParticipants: null,
      notes: '', colorTag: null, participantUserIds: [], participantClientIds: [],
    });
    this.editingId = 0;
    this.modalMode.set('create');
    this.modalError.set('');
    this.modalNotice.set('');
    this.modalOpen.set(true);
  }

  openEdit(m: Meeting, $event: Event): void {
    $event.stopPropagation();
    this.form.set({
      title: m.title, description: m.description ?? '', startUtc: this.toDatetimeLocal(new Date(m.startUtc)),
      endUtc: this.toDatetimeLocal(new Date(m.endUtc)), location: m.location ?? '',
      meetingType: m.meetingType, isPaid: m.isPaid,
      feePerParticipant: m.feePerParticipant ?? null, maxParticipants: m.maxParticipants ?? null,
      notes: m.notes ?? '', colorTag: m.colorTag ?? null,
      participantUserIds: [], participantClientIds: [],
    });
    this.editingId = m.meetingId;
    this.modalMode.set('edit');
    this.modalError.set('');
    this.modalNotice.set('');
    this.modalOpen.set(true);
  }

  saveForm(): void {
    const f = this.form();
    if (!f.title.trim() || !f.startUtc || !f.endUtc) {
      this.modalError.set('Title, start time and end time are required.');
      return;
    }

    this.modalBusy.set(true);
    this.modalError.set('');

    const start = new Date(f.startUtc).toISOString();
    const end   = new Date(f.endUtc).toISOString();

    if (this.modalMode() === 'create') {
      this.svc.create({ ...f, startUtc: start, endUtc: end }).subscribe({
        next: () => {
          this.modalOpen.set(false);
          this.modalBusy.set(false);
          this.load();
        },
        error: (e: Error) => {
          this.modalError.set(e.message || 'Could not create meeting.');
          this.modalBusy.set(false);
        },
      });
    } else {
      const req: UpdateMeetingRequest = { ...f, startUtc: start, endUtc: end };
      this.svc.update(this.editingId, req).subscribe({
        next: () => {
          this.modalOpen.set(false);
          this.modalBusy.set(false);
          this.load();
        },
        error: (e: Error) => {
          this.modalError.set(e.message || 'Could not update meeting.');
          this.modalBusy.set(false);
        },
      });
    }
  }

  setFormField<K extends keyof CreateMeetingRequest>(key: K, value: CreateMeetingRequest[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  // ================================================================ Detail

  openDetail(m: Meeting): void {
    this.detail.set(null);
    this.detailLoading.set(true);
    this.modalMode.set('detail');
    this.modalError.set('');
    this.partError.set('');
    this.modalOpen.set(true);
    this.addPartUserId.set(null);
    this.addPartClientId.set(null);
    this.addPartRole.set('Attendee');

    this.svc.getById(m.meetingId).subscribe({
      next: (d) => { this.detail.set(d); this.detailLoading.set(false); },
      error: (e: Error) => { this.modalError.set(e.message || 'Could not load meeting details.'); this.detailLoading.set(false); },
    });
  }

  // ================================================================ Status

  updateStatus(m: Meeting, status: string, $event: Event): void {
    $event.stopPropagation();
    if (!confirm(`Set meeting status to "${status}"?`)) return;
    this.svc.updateStatus(m.meetingId, status).subscribe({
      next: () => this.load(),
      error: (e: Error) => this.error.set(e.message || 'Could not update status.'),
    });
  }

  // ================================================================ Delete

  deleteMeeting(m: Meeting, $event: Event): void {
    $event.stopPropagation();
    if (!confirm(`Delete meeting "${m.title}"? This cannot be undone.`)) return;
    this.svc.remove(m.meetingId).subscribe({
      next: () => this.load(),
      error: (e: Error) => this.error.set(e.message || 'Could not delete meeting.'),
    });
  }

  // ================================================================ Participants

  addParticipant(): void {
    const d = this.detail();
    if (!d) return;
    const uid = this.addPartMode() === 'user'   ? this.addPartUserId()   : null;
    const cid = this.addPartMode() === 'client' ? this.addPartClientId() : null;
    if (!uid && !cid) { this.partError.set('Select a user or client to add.'); return; }

    this.partBusy.set(true);
    this.partError.set('');
    this.svc.addParticipant(d.meetingId, { userId: uid, clientId: cid, participantRole: this.addPartRole() }).subscribe({
      next: (p) => {
        this.detail.update((prev) => prev ? { ...prev, participants: [...prev.participants, p], participantCount: prev.participantCount + 1 } : prev);
        this.addPartUserId.set(null);
        this.addPartClientId.set(null);
        this.partBusy.set(false);
      },
      error: (e: Error) => { this.partError.set(e.message || 'Could not add participant.'); this.partBusy.set(false); },
    });
  }

  removeParticipant(p: MeetingParticipant): void {
    const d = this.detail();
    if (!d || p.participantRole === 'Host') return;
    if (!confirm(`Remove ${this.displayName(p)} from this meeting?`)) return;
    this.svc.removeParticipant(d.meetingId, p.participantId).subscribe({
      next: () => this.detail.update((prev) => prev ? { ...prev, participants: prev.participants.filter((x) => x.participantId !== p.participantId), participantCount: prev.participantCount - 1 } : prev),
      error: (e: Error) => this.partError.set(e.message || 'Could not remove participant.'),
    });
  }

  respond(status: ParticipantStatus): void {
    const d = this.detail();
    if (!d) return;
    this.rsvpBusy.set(true);
    this.svc.respond(d.meetingId, { status }).subscribe({
      next: () => {
        this.rsvpBusy.set(false);
        // refresh detail
        this.svc.getById(d.meetingId).subscribe({ next: (x) => this.detail.set(x), error: () => {} });
      },
      error: (e: Error) => { this.modalError.set(e.message || 'Could not record response.'); this.rsvpBusy.set(false); },
    });
  }

  myParticipant(d: MeetingDetail): MeetingParticipant | undefined {
    const uid = this.user()?.userId;
    return d.participants.find((p) => p.userId === uid);
  }

  // ================================================================ Payments

  openPayments(m: Meeting, $event: Event): void {
    $event.stopPropagation();
    this.paymentMeetingId.set(m.meetingId);
    this.payments.set([]);
    this.paymentSummary.set(null);
    this.payBusy.set(false);
    this.payError.set('');
    this.payNotice.set('');
    this.payForm.set({ participantId: 0, amount: m.feePerParticipant ?? 0, method: 'Cash', status: 'Paid', transactionId: '', notes: '' });
    this.modalMode.set('payment');
    this.modalError.set('');
    this.modalOpen.set(true);

    this.svc.getPayments(m.meetingId).subscribe({ next: (p) => this.payments.set(p), error: () => {} });
    this.svc.getPaymentSummary(m.meetingId).subscribe({ next: (s) => this.paymentSummary.set(s), error: () => {} });

    // Load participants for dropdown
    this.svc.getById(m.meetingId).subscribe({ next: (d) => this.detail.set(d), error: () => {} });
  }

  recordPayment(): void {
    const f = this.payForm();
    if (!f.participantId || f.amount <= 0) { this.payError.set('Select a participant and enter an amount.'); return; }
    this.payBusy.set(true);
    this.payError.set('');
    this.payNotice.set('');
    this.svc.recordPayment(this.paymentMeetingId(), {
      participantId: f.participantId,
      amount: f.amount,
      method: f.method,
      status: f.status,
      transactionId: f.transactionId || null,
      notes: f.notes || null,
    }).subscribe({
      next: (p) => {
        this.payments.update((prev) => [p, ...prev]);
        this.payNotice.set('Payment recorded.');
        this.payBusy.set(false);
        // refresh summary
        this.svc.getPaymentSummary(this.paymentMeetingId()).subscribe({ next: (s) => this.paymentSummary.set(s), error: () => {} });
      },
      error: (e: Error) => { this.payError.set(e.message || 'Could not record payment.'); this.payBusy.set(false); },
    });
  }

  setPayField<K extends keyof ReturnType<typeof this.payForm>>(key: K, value: any): void {
    this.payForm.update((f) => ({ ...f, [key]: value }));
  }

  // ================================================================ Calendar

  calLabel(): string {
    return this.calAnchor().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  calPrev(): void { this.calAnchor.update((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; }); }
  calNext(): void { this.calAnchor.update((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; }); }
  calToday(): void { this.calAnchor.set(new Date()); }

  buildCalDays(anchor: Date): { date: Date; meetings: Meeting[] }[] {
    const year  = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const cells: { date: Date; meetings: Meeting[] }[] = [];

    // pad start
    for (let i = 0; i < first.getDay(); i++) {
      const d = new Date(year, month, 1 - (first.getDay() - i));
      cells.push({ date: d, meetings: [] });
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const mtgs = this.meetings().filter((m) => {
        const s = new Date(m.startUtc);
        return s.getFullYear() === year && s.getMonth() === month && s.getDate() === d;
      });
      cells.push({ date, meetings: mtgs });
    }

    // pad end to full rows
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      cells.push({ date: next, meetings: [] });
    }
    return cells;
  }

  isToday(d: Date): boolean {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  isCurrentMonth(d: Date): boolean {
    const a = this.calAnchor();
    return d.getMonth() === a.getMonth() && d.getFullYear() === a.getFullYear();
  }

  // ================================================================ Helpers

  closeModal(): void {
    this.modalOpen.set(false);
    this.detail.set(null);
  }

  private toDatetimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  formatTime(utc: string): string {
    return new Date(utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(utc: string): string {
    return new Date(utc).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  duration(start: string, end: string): string {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
}
