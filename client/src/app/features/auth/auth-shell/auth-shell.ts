import { Component } from '@angular/core';

/**
 * Split-screen auth layout: a branded gradient panel on the left (hidden on
 * small screens) and a projected form card on the right.
 */
@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  readonly stats = [
    { label: 'Jobs Dispatched', value: '1.2M+' },
    { label: 'Active Teams', value: '2,400+' },
    { label: 'Uptime SLA', value: '99.97%' },
  ];
}
