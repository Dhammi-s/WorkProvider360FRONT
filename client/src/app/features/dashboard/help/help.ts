/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Faq {
  q: string;
  a: string;
  category: string;
}

/** Help centre: searchable how-to guide grouped by topic (static content). */
@Component({
  selector: 'app-help',
  imports: [RouterLink],
  templateUrl: './help.html',
})
export class Help {
  readonly query = signal('');
  readonly openId = signal<number | null>(0);

  private readonly faqs: Faq[] = [
    { category: 'Getting started', q: 'How do I sign in?', a: 'Use the email and password provided by your administrator on the sign-in screen. If you forgot your password, use “Forgot password?” to receive a reset link by email.' },
    { category: 'Getting started', q: 'How do I change my profile photo?', a: 'Open My Profile from the sidebar, click the camera icon on your avatar, choose an image, crop it, and save. Your photo appears in the top bar and team list.' },
    { category: 'Scheduling', q: 'How do I clock in and out of a shift?', a: 'Open the Scheduler, select your assigned shift, and use the Clock in / Clock out buttons in the shift details. After one full clock-in/out the buttons lock for that shift.' },
    { category: 'Scheduling', q: 'What is auto clock-in/out?', a: 'If enabled by an admin in Settings → Scheduling, the system automatically records the scheduled hours for a shift you forgot to clock in/out on, once the shift has ended.' },
    { category: 'Scheduling', q: 'Where do I see my own schedule?', a: 'Your upcoming shifts appear on My Profile under “My schedule”, and in full on the Scheduler.' },
    { category: 'Team & applications', q: 'How do I add a team member?', a: 'Admins and Super Admins can open Team and use “Add team member”. You can set a name, email, temporary password, role, phone and office.' },
    { category: 'Team & applications', q: 'How are role applications approved?', a: 'Open Applications, review the applicant’s details, and Approve or Reject. Approving creates the account and emails temporary credentials.' },
    { category: 'Account', q: 'How do I change my password?', a: 'Open My Profile, fill in the Change password form with your current and new password, and save.' },
    { category: 'Account', q: 'I can’t reach the app / I’m offline', a: 'If you lose internet, the app shows a “No internet connection” screen and reconnects automatically once you are back online.' },
  ];

  readonly filtered = computed<Faq[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.faqs;
    return this.faqs.filter((f) => (f.q + ' ' + f.a + ' ' + f.category).toLowerCase().includes(q));
  });

  toggle(i: number): void {
    this.openId.set(this.openId() === i ? null : i);
  }
}
