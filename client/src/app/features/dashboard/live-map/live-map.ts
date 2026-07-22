import { DatePipe } from '@angular/common';
import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';
import { LiveLocation } from '../../../core/models/scheduler.model';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { Alert } from '../../../shared/ui/alert/alert';

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#14b8a6', '#d946ef'];
const colorHex = (userId: number) => PALETTE[Math.abs(userId) % PALETTE.length];

/** Live map of on-shift workers, updated in real time over SignalR. */
@Component({
  selector: 'app-live-map',
  imports: [DatePipe, Alert],
  templateUrl: './live-map.html',
})
export class LiveMap {
  private readonly service = inject(SchedulerService);
  private readonly tokens = inject(TokenStorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly live = signal<LiveLocation[]>([]);
  readonly error = signal('');
  readonly connected = signal(false);
  readonly selected = signal<number | null>(null);

  private map: L.Map | null = null;
  private readonly markers = new Map<number, L.Marker>();
  private trailLayer: L.Polyline | null = null;
  private hub: HubConnection | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private fitted = false;

  private static readonly POLL_MS = 15_000;

  constructor() {
    afterNextRender(() => {
      this.initMap();
      this.refresh();
      this.connect();
      // Fallback so the map stays fresh even if the live socket can't connect
      // (e.g. WebSockets blocked on the host).
      this.pollTimer = setInterval(() => this.refresh(), LiveMap.POLL_MS);
    });
    this.destroyRef.onDestroy(() => {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.hub?.stop();
      this.map?.remove();
    });
  }

  private initMap(): void {
    this.map = L.map('live-map', { zoomControl: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
    // The container often isn't fully laid out when the map is created inside a
    // grid/flex parent — recalculate once the browser has settled so tiles fill
    // the whole box instead of a small broken square.
    setTimeout(() => this.map?.invalidateSize(), 250);
  }

  refresh(): void {
    this.service.liveLocations().subscribe({
      next: (rows) => {
        this.live.set(rows);
        this.map?.invalidateSize();
        rows.forEach((r) => this.upsert(r));
        // Only auto-centre the first time we get data, so later refreshes don't
        // yank the map away while an admin is panning around.
        if (!this.fitted && rows.length) {
          this.fitToMarkers();
          this.fitted = true;
        }
      },
      error: (err: Error) => this.error.set(err.message || 'Could not load live locations.'),
    });
  }

  private connect(): void {
    const url = `${environment.hubBaseUrl}/hubs/location`;
    this.hub = new HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => this.tokens.accessToken ?? '',
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.hub.on('locationUpdated', (loc: LiveLocation) => {
      this.mergeLive(loc);
      this.upsert(loc);
    });

    this.hub.onreconnected(() => this.connected.set(true));
    this.hub.onclose(() => this.connected.set(false));

    this.hub
      .start()
      .then(() => this.connected.set(true))
      .catch(() => this.connected.set(false));
  }

  private mergeLive(loc: LiveLocation): void {
    const rows = this.live().filter((r) => r.scheduleId !== loc.scheduleId);
    this.live.set([loc, ...rows]);
  }

  private upsert(loc: LiveLocation): void {
    if (!this.map) return;
    const latlng: L.LatLngExpression = [Number(loc.latitude), Number(loc.longitude)];
    const existing = this.markers.get(loc.scheduleId);
    if (existing) {
      existing.setLatLng(latlng).bindPopup(this.popup(loc));
    } else {
      const marker = L.marker(latlng, { icon: this.icon(loc.userId) })
        .addTo(this.map)
        .bindPopup(this.popup(loc))
        .on('click', () => this.select(loc.scheduleId));
      this.markers.set(loc.scheduleId, marker);
    }
  }

  private icon(userId: number): L.DivIcon {
    const c = colorHex(userId);
    return L.divIcon({
      className: '',
      html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${c};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  private popup(loc: LiveLocation): string {
    const when = new Date(loc.recordedUtc.replace('Z', '')).toLocaleString();
    return `<strong>${loc.userName}</strong><br>${loc.title}${loc.customerName ? ' · ' + loc.customerName : ''}<br><span style="color:#64748b">Updated ${when}</span>`;
  }

  select(scheduleId: number): void {
    this.selected.set(scheduleId);
    const marker = this.markers.get(scheduleId);
    if (marker && this.map) {
      this.map.invalidateSize();
      this.map.setView(marker.getLatLng(), Math.max(this.map.getZoom(), 16));
      marker.openPopup();
    }
    this.loadTrail(scheduleId);
  }

  private loadTrail(scheduleId: number): void {
    this.service.trail(scheduleId).subscribe({
      next: (pings) => {
        if (this.trailLayer && this.map) {
          this.map.removeLayer(this.trailLayer);
          this.trailLayer = null;
        }
        if (pings.length > 1 && this.map) {
          const pts = pings.map((p) => [Number(p.latitude), Number(p.longitude)] as L.LatLngExpression);
          this.trailLayer = L.polyline(pts, { color: colorHex(pings[0].userId), weight: 4, opacity: 0.7 }).addTo(this.map);
        }
      },
      error: () => {},
    });
  }

  private fitToMarkers(): void {
    if (!this.map || this.markers.size === 0) return;
    this.map.invalidateSize();
    if (this.markers.size === 1) {
      this.map.setView([...this.markers.values()][0].getLatLng(), 16);
      return;
    }
    const group = L.featureGroup([...this.markers.values()]);
    this.map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 16 });
  }

  colorHex = colorHex;
}
