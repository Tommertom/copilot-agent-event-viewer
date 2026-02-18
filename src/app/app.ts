import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Session, LogEntry } from './api.service';
import { FeedbackFormComponent } from './feedback-form.component';
import { FeedbackIndicatorComponent } from './feedback-indicator.component';
import { FeedbackViewerComponent } from './feedback-viewer.component';
import { FeedbackAnalyticsComponent } from './feedback-analytics.component';
import { SessionFeedback, CreateSessionFeedback } from './feedback-types';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, FeedbackFormComponent, FeedbackIndicatorComponent, FeedbackViewerComponent, FeedbackAnalyticsComponent],
  template: `<div class="app-container">
  <header class="app-header">
    <h1>🤖 Agent Event Viewer</h1>
    <div class="header-right">
      <div class="api-url-container">
        @if (!editingApiUrl()) {
          <div class="api-url-display" (click)="startEditingApiUrl()" title="Click to edit API URL">
            <span class="api-url-label">API:</span>
            <code class="api-url-value">{{ getApiUrl() }}</code>
            <span class="edit-icon">✏️</span>
          </div>
        } @else {
          <div class="api-url-editor">
            <input
              type="text"
              class="api-url-input"
              [(ngModel)]="tempApiUrl"
              placeholder="http://localhost:3000"
              (keydown.enter)="saveApiUrl()"
              (keydown.escape)="cancelEditApiUrl()"
              autofocus
            />
            <button class="btn-save" (click)="saveApiUrl()" title="Save">✓</button>
            <button class="btn-cancel" (click)="cancelEditApiUrl()" title="Cancel">✕</button>
          </div>
        }
      </div>
      <button class="btn-analytics" (click)="openAnalytics()" title="View Feedback Analytics">
        📊 Analytics
      </button>
      <div class="header-stats">
        <span class="stat">{{ sessions().length }} Sessions</span>
        @if (selectedSession()) {
          <span class="stat">{{ selectedSession()!.events.length }} Events</span>
        }
      </div>
    </div>
  </header>

  <div class="main-content">
    <!-- Left Sidebar: Session List -->
    <aside class="session-list">
      <div class="session-list-header">
        <h2>Sessions</h2>
        @if (loading()) {
          <div class="loading">Loading...</div>
        }
      </div>

      <div class="sessions">
        @for (session of sessions(); track session.sessionId) {
          <div
            class="session-item"
            [class.active]="selectedSession()?.sessionId === session.sessionId"
            (click)="selectSession(session)">
            <div class="session-header">
              <span class="session-id">{{ getShortId(session.sessionId) }}</span>
              <span class="session-time">{{ formatTime(session.startTime) }}</span>
            </div>
            <div class="session-meta">
              <span class="event-count">{{ session.events.length }} events</span>
              <span class="session-date">{{ formatDate(session.startTime) }}</span>
            </div>
            <div class="session-feedback">
              <app-feedback-indicator [feedback]="getFeedbackForSession(session.sessionId)"></app-feedback-indicator>
            </div>
          </div>
        } @empty {
          @if (!loading()) {
            <div class="empty-state">No sessions found</div>
          }
        }
      </div>
    </aside>

    <!-- Right Panel: Event Flow -->
    <main class="event-panel">
      @if (selectedSession()) {
        <div class="event-panel-header">
          <h2>Session Events</h2>
          <div class="session-info">
            <span class="info-label">Session ID:</span>
            <code class="session-id-full">{{ selectedSession()!.sessionId }}</code>
            @if (selectedSessionFeedback()) {
              <button class="btn-feedback" (click)="openFeedbackViewer()" title="View Feedback">
                👁️ View Feedback
              </button>
            }
            <button class="btn-feedback" (click)="openFeedbackForm()" title="Provide Feedback">
              @if (selectedSessionFeedback()) {
                ✏️ Edit Feedback
              } @else {
                📝 Provide Feedback
              }
            </button>
          </div>
        </div>

        <div class="events-timeline">
          @for (entry of selectedSession()!.events; track entry.filename; let i = $index) {
            <div class="event-card" [attr.data-event-type]="entry.content.hookName">
              <div class="event-header">
                <span class="event-number">{{ i + 1 }}</span>
                <span class="event-type" [class]="'event-type-' + entry.content.hookName">
                  {{ entry.content.hookName }}
                </span>
                <span class="event-time">{{ formatEventTime(entry.content.isoTimestamp) }}</span>
              </div>

              <div class="event-body">
                @switch (entry.content.hookName) {
                  @case ('sessionStart') {
                    <div class="event-detail">
                      <strong>Session Started</strong>
                      <div class="detail-row">
                        <span class="label">Source:</span>
                        <span>{{ entry.content.input.source }}</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Working Directory:</span>
                        <code>{{ entry.content.input.cwd }}</code>
                      </div>
                    </div>
                  }
                  @case ('userPromptSubmitted') {
                    <div class="event-detail">
                      <strong>User Prompt</strong>
                      <div class="prompt-text">{{ entry.content.input.prompt }}</div>
                    </div>
                  }
                  @case ('preToolUse') {
                    <div class="event-detail">
                      <strong>Tool: {{ entry.content.input.tool_name }}</strong>
                      <div class="detail-row">
                        <span class="label">Goal:</span>
                        <span>{{ entry.content.input.tool_input?.goal }}</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Explanation:</span>
                        <span>{{ entry.content.input.tool_input?.explanation }}</span>
                      </div>
                      @if (entry.content.input.tool_input?.command) {
                        <div class="detail-row">
                          <span class="label">Command:</span>
                          <code class="command">{{ entry.content.input.tool_input.command }}</code>
                        </div>
                      }
                      @if (entry.content.input.tool_input?.['filePath']) {
                        <div class="detail-row">
                          <span class="label">File:</span>
                          <code>{{ entry.content.input.tool_input['filePath'] }}</code>
                        </div>
                      }
                    </div>
                  }
                  @case ('postToolUse') {
                    <div class="event-detail">
                      <strong>Tool Result: {{ entry.content.input.tool_name }}</strong>
                      @if (entry.content.input.tool_response) {
                        <div class="tool-response">
                          <pre>{{ truncateResponse(entry.content.input.tool_response) }}</pre>
                        </div>
                      }
                    </div>
                  }
                  @default {
                    <div class="event-detail">
                      <strong>Unknown Event</strong>
                      <pre class="raw-data">{{ formatJson(entry.content) }}</pre>
                    </div>
                  }
                }
              </div>

              <div class="event-footer">
                <span class="filename">{{ entry.filename }}</span>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="empty-panel">
          <div class="empty-icon">📋</div>
          <h3>No Session Selected</h3>
          <p>Select a session from the left sidebar to view its event flow</p>
        </div>
      }
    </main>
  </div>

  <!-- Feedback Form Modal -->
  @if (showFeedbackForm() && selectedSession()) {
    <app-feedback-form
      [session]="selectedSession()!"
      (submit)="submitFeedback($event)"
      (cancel)="closeFeedbackForm()">
    </app-feedback-form>
  }

  <!-- Feedback Viewer Modal -->
  @if (showFeedbackViewer() && viewingFeedback()) {
    <app-feedback-viewer
      [feedback]="viewingFeedback()!"
      (close)="closeFeedbackViewer()"
      (update)="updateFeedback(viewingFeedback()!.id, $event)"
      (delete)="deleteFeedback(viewingFeedback()!.id)">
    </app-feedback-viewer>
  }

  <!-- Analytics Panel -->
  @if (showAnalytics()) {
    <app-feedback-analytics
      [allFeedback]="allFeedbacksArray()"
      (close)="closeAnalytics()"
      (selectFeedback)="viewFeedbackFromAnalytics($event)"
      (exportData)="exportFeedbackData($event)">
    </app-feedback-analytics>
  }
</div>`,
  styles: `.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}

.app-header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 1.5rem 2rem;
  border-bottom: 2px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.app-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.api-url-container {
  display: flex;
  align-items: center;
}

.api-url-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(99, 102, 241, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.api-url-display:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.5);
}

.api-url-label {
  font-size: 0.75rem;
  color: #a5b4fc;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.api-url-value {
  font-size: 0.875rem;
  color: #c7d2fe;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.edit-icon {
  font-size: 0.875rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.api-url-display:hover .edit-icon {
  opacity: 1;
}

.api-url-editor {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.api-url-input {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.5);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: #c7d2fe;
  font-size: 0.875rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  width: 250px;
  outline: none;
  transition: border-color 0.2s ease;
}

.api-url-input:focus {
  border-color: rgba(99, 102, 241, 0.8);
}

.api-url-input::placeholder {
  color: #64748b;
}

.btn-save,
.btn-cancel {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 0.375rem;
  padding: 0.375rem 0.625rem;
  color: #c7d2fe;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-save:hover {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.6);
}

.btn-cancel:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.6);
}

.header-stats {
  display: flex;
  gap: 1.5rem;
}

.stat {
  background: rgba(59, 130, 246, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
  font-size: 0.875rem;
  color: #93c5fd;
  font-weight: 500;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Session List Sidebar */
.session-list {
  width: 350px;
  background: #1e293b;
  border-right: 2px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.session-list-header {
  padding: 1.5rem;
  border-bottom: 1px solid #334155;
  background: #1a2332;
}

.session-list-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.loading {
  margin-top: 0.5rem;
  color: #94a3b8;
  font-size: 0.875rem;
}

.sessions {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.session-item {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-item:hover {
  background: #1e293b;
  border-color: #3b82f6;
  transform: translateX(4px);
}

.session-item.active {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  border-color: #60a5fa;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.session-id {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #60a5fa;
  font-weight: 600;
}

.session-time {
  font-size: 0.75rem;
  color: #94a3b8;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #94a3b8;
}

.event-count {
  background: rgba(59, 130, 246, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  color: #93c5fd;
}

/* Event Panel */
.event-panel {
  flex: 1;
  background: #0f172a;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.event-panel-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #334155;
  background: #1a2332;
}

.event-panel-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 0.75rem 0;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
}

.session-id-full {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.events-timeline {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}

.event-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.event-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.event-header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid #334155;
}

.event-number {
  background: #3b82f6;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.event-type {
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  flex: 1;
}

.event-type-sessionStart {
  background: rgba(34, 197, 94, 0.1);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.event-type-userPromptSubmitted {
  background: rgba(168, 85, 247, 0.1);
  color: #c4b5fd;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.event-type-preToolUse {
  background: rgba(234, 179, 8, 0.1);
  color: #fde047;
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.event-type-postToolUse {
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.event-time {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: 'Courier New', monospace;
}

.event-body {
  padding: 1rem;
}

.event-detail strong {
  display: block;
  color: #f1f5f9;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.detail-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.detail-row .label {
  color: #94a3b8;
  font-weight: 500;
  min-width: 100px;
}

.detail-row span:last-child {
  color: #e2e8f0;
  flex: 1;
}

.detail-row code {
  background: rgba(59, 130, 246, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: #93c5fd;
  flex: 1;
}

.command {
  display: block;
  background: #0f172a;
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #334155;
  color: #fbbf24;
  overflow-x: auto;
}

.prompt-text {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  padding: 1rem;
  color: #e2e8f0;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-response {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 0.5rem;
}

.tool-response pre {
  color: #94a3b8;
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
  margin: 0;
}

.raw-data {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  padding: 1rem;
  color: #94a3b8;
  font-size: 0.75rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0.5rem 0 0 0;
}

.event-footer {
  padding: 0.5rem 1rem;
  background: rgba(15, 23, 42, 0.5);
  border-top: 1px solid #334155;
}

.filename {
  font-size: 0.75rem;
  color: #64748b;
  font-family: 'Courier New', monospace;
}

.empty-panel, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-panel h3 {
  font-size: 1.5rem;
  color: #94a3b8;
  margin: 0 0 0.5rem 0;
}

.empty-panel p {
  color: #64748b;
  font-size: 0.875rem;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #0f172a;
}

::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

/* Feedback UI Styles */
.session-feedback {
  margin-top: 0.5rem;
}

.btn-feedback {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  color: #c7d2fe;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 1rem;
  font-weight: 500;
}

.btn-feedback:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: rgba(99, 102, 241, 0.6);
  transform: translateY(-1px);
}

.btn-feedback:active {
  transform: translateY(0);
}

.btn-analytics {
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  color: #c4b5fd;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.btn-analytics:hover {
  background: rgba(139, 92, 246, 0.3);
  border-color: rgba(139, 92, 246, 0.6);
  transform: translateY(-1px);
}

.btn-analytics:active {
  transform: translateY(0);
}

`
})
export class App implements OnInit {
  private apiService = inject(ApiService);

  sessions = signal<Session[]>([]);
  selectedSession = signal<Session | null>(null);
  loading = signal(true);
  editingApiUrl = signal(false);
  tempApiUrl = signal('');
  
  // Feedback state
  showFeedbackForm = signal(false);
  showFeedbackViewer = signal(false);
  showAnalytics = signal(false);
  sessionFeedbacks = signal<Map<string, SessionFeedback>>(new Map());
  viewingFeedback = signal<SessionFeedback | null>(null);
  
  // Computed feedback for selected session
  selectedSessionFeedback = computed(() => {
    const session = this.selectedSession();
    if (!session) return null;
    return this.sessionFeedbacks().get(session.sessionId) || null;
  });

  // Get all feedbacks as array for analytics
  allFeedbacksArray = computed(() => {
    return Array.from(this.sessionFeedbacks().values());
  });

  ngOnInit() {
    this.loadSessions();
    this.loadAllFeedback();
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

  // Feedback management
  loadAllFeedback(): void {
    this.apiService.getAllFeedback().subscribe({
      next: (feedbacks) => {
        const feedbackMap = new Map<string, SessionFeedback>();
        feedbacks.forEach(fb => feedbackMap.set(fb.sessionId, fb));
        this.sessionFeedbacks.set(feedbackMap);
      },
      error: (error) => console.error('Error loading feedback:', error)
    });
  }

  getFeedbackForSession(sessionId: string): SessionFeedback | null {
    return this.sessionFeedbacks().get(sessionId) || null;
  }

  openFeedbackForm(): void {
    this.showFeedbackForm.set(true);
  }

  closeFeedbackForm(): void {
    this.showFeedbackForm.set(false);
  }

  submitFeedback(feedback: CreateSessionFeedback): void {
    this.apiService.submitFeedback(feedback).subscribe({
      next: (response) => {
        console.log('Feedback submitted successfully:', response);
        this.loadAllFeedback(); // Reload feedback
        this.closeFeedbackForm();
      },
      error: (error) => {
        console.error('Error submitting feedback:', error);
        alert('Failed to submit feedback. Please try again.');
      }
    });
  }

  // Feedback viewer
  openFeedbackViewer(): void {
    const feedback = this.selectedSessionFeedback();
    if (feedback) {
      this.viewingFeedback.set(feedback);
      this.showFeedbackViewer.set(true);
    }
  }

  closeFeedbackViewer(): void {
    this.showFeedbackViewer.set(false);
    this.viewingFeedback.set(null);
  }

  updateFeedback(feedbackId: string, updates: Partial<SessionFeedback>): void {
    this.apiService.updateFeedback(feedbackId, updates).subscribe({
      next: (updated) => {
        console.log('Feedback updated successfully:', updated);
        this.loadAllFeedback();
        this.closeFeedbackViewer();
      },
      error: (error) => {
        console.error('Error updating feedback:', error);
        alert('Failed to update feedback. Please try again.');
      }
    });
  }

  deleteFeedback(feedbackId: string): void {
    this.apiService.deleteFeedback(feedbackId).subscribe({
      next: (result) => {
        if (result.success) {
          console.log('Feedback deleted successfully');
          this.loadAllFeedback();
          this.closeFeedbackViewer();
        }
      },
      error: (error) => {
        console.error('Error deleting feedback:', error);
        alert('Failed to delete feedback. Please try again.');
      }
    });
  }

  // Analytics
  openAnalytics(): void {
    this.showAnalytics.set(true);
  }

  closeAnalytics(): void {
    this.showAnalytics.set(false);
  }

  viewFeedbackFromAnalytics(feedback: SessionFeedback): void {
    this.viewingFeedback.set(feedback);
    this.showAnalytics.set(false);
    this.showFeedbackViewer.set(true);
  }

  exportFeedbackData(feedbacks: SessionFeedback[]): void {
    const dataStr = JSON.stringify(feedbacks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
