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
