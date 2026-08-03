/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { ChatbotService, ChatTurn } from '../../../core/services/chatbot.service';

/** Floating in-app assistant that answers questions about WorkProvider360. */
@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.html',
})
export class ChatWidget {
  private readonly chatbot = inject(ChatbotService);

  private readonly greeting: ChatTurn = {
    role: 'assistant',
    content: 'Hi! I’m your WorkProvider360 assistant. Ask me how anything in the app works.',
  };

  readonly open = signal(false);
  readonly sending = signal(false);
  readonly historyLoading = signal(false);
  readonly input = signal('');
  readonly error = signal('');
  readonly messages = signal<ChatTurn[]>([this.greeting]);

  readonly suggestions = [
    'How do I clock in and out?',
    'How do I add a team member?',
    'What can a Manager do?',
    'How do applications get approved?',
  ];

  private loaded = false;

  toggle(): void {
    const opening = !this.open();
    this.open.set(opening);
    if (opening && !this.loaded) this.loadHistory();
  }

  private loadHistory(): void {
    this.loaded = true;
    this.historyLoading.set(true);
    this.chatbot.history().subscribe({
      next: (turns) => {
        this.historyLoading.set(false);
        this.messages.set(turns.length ? turns : [this.greeting]);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  clearHistory(): void {
    this.chatbot.clear().subscribe({
      next: () => this.messages.set([this.greeting]),
      error: () => {},
    });
  }

  ask(question: string): void {
    const q = question.trim();
    if (!q || this.sending()) return;

    const history: ChatTurn[] = this.messages().slice(-6);
    this.messages.update((m) => [...m, { role: 'user', content: q }]);
    this.input.set('');
    this.error.set('');
    this.sending.set(true);

    this.chatbot.ask(q, history).subscribe({
      next: (answer) => {
        this.sending.set(false);
        this.messages.update((m) => [...m, { role: 'assistant', content: answer }]);
      },
      error: (err: Error) => {
        this.sending.set(false);
        this.error.set(err.message || 'The assistant is unavailable right now.');
      },
    });
  }

  send(): void {
    this.ask(this.input());
  }
}
