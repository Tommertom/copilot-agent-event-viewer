import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Session, LogEntry } from './api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private apiService = inject(ApiService);

  sessions = signal<Session[]>([]);
  selectedSession = signal<Session | null>(null);
  loading = signal(true);
  editingApiUrl = signal(false);
  tempApiUrl = signal('');

  ngOnInit() {
    this.loadSessions();
  }

  loadSessions() {
    this.loading.set(true);
    this.apiService.getAllLogEntries().subscribe({
      next: (entries) => {
        const sessions = this.apiService.getSessionsFromEntries(entries);
        this.sessions.set(sessions);
        this.loading.set(false);

        // Auto-select first session if available
        if (sessions.length > 0) {
          this.selectedSession.set(sessions[0]);
        }
      },
      error: (error) => {
        console.error('Error loading sessions:', error);
        this.loading.set(false);
      }
    });
  }

  selectSession(session: Session) {
    this.selectedSession.set(session);
  }

  getShortId(sessionId: string): string {
    return sessionId.split('-')[0];
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  formatEventTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  truncateResponse(response: string, maxLength: number = 500): string {
    if (!response) return '';
    if (response.length <= maxLength) return response;
    return response.substring(0, maxLength) + '\n... (truncated)';
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  // API URL management
  getApiUrl(): string {
    return this.apiService.apiUrl();
  }

  startEditingApiUrl(): void {
    this.tempApiUrl.set(this.apiService.apiUrl());
    this.editingApiUrl.set(true);
  }

  saveApiUrl(): void {
    const url = this.tempApiUrl().trim();
    if (url) {
      this.apiService.updateApiUrl(url);
      this.editingApiUrl.set(false);
      // Reload sessions with new API URL
      this.loadSessions();
    }
  }

  cancelEditApiUrl(): void {
    this.editingApiUrl.set(false);
    this.tempApiUrl.set('');
  }
}
