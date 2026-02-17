import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { CopilotEvent } from './copilot-event-types';
import { SessionFeedback, CreateSessionFeedback, FeedbackFilters } from './feedback-types';

export interface LogEntry {
    filename: string;
    content: CopilotEvent;
}

export interface Session {
    sessionId: string;
    startTime: string;
    events: LogEntry[];
}

const STORAGE_KEY = 'agent-event-viewer-api-url';
const FEEDBACK_STORAGE_KEY = 'agent-event-viewer-feedback';
const DEFAULT_API_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);
    
    // Make API URL configurable with signal
    apiUrl = signal<string>(this.loadApiUrl());

    constructor() {
        // Persist API URL changes to localStorage
        effect(() => {
            const url = this.apiUrl();
            localStorage.setItem(STORAGE_KEY, url);
        });
    }

    private loadApiUrl(): string {
        try {
            return localStorage.getItem(STORAGE_KEY) || DEFAULT_API_URL;
        } catch {
            return DEFAULT_API_URL;
        }
    }

    updateApiUrl(url: string): void {
        this.apiUrl.set(url);
    }

    getAllLogEntries(): Observable<LogEntry[]> {
        return this.http
            .get<{ success: boolean; count: number; entries: LogEntry[] }>(
                `${this.apiUrl()}/get_all_log_entries`
            )
            .pipe(map((response) => response.entries));
    }

    getSessionsFromEntries(entries: LogEntry[]): Session[] {
        const sessionMap = new Map<string, LogEntry[]>();

        // Group entries by sessionId
        entries.forEach((entry) => {
            if (entry.content?.input?.sessionId) {
                const sessionId = entry.content.input.sessionId;
                if (!sessionMap.has(sessionId)) {
                    sessionMap.set(sessionId, []);
                }
                sessionMap.get(sessionId)!.push(entry);
            }
        });

        // Convert to Session objects and sort events by timestamp
        const sessions: Session[] = [];
        sessionMap.forEach((events, sessionId) => {
            events.sort((a, b) => a.content.timestamp - b.content.timestamp);
            sessions.push({
                sessionId,
                startTime: events[0]?.content.isoTimestamp || '',
                events,
            });
        });

        // Sort sessions by start time (most recent first)
        return sessions.sort((a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
    }

    // ===== Feedback Methods =====

    private loadFeedbackFromStorage(): SessionFeedback[] {
        try {
            const data = localStorage.getItem(FEEDBACK_STORAGE_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            // Convert timestamp strings back to Date objects
            return parsed.map((fb: any) => ({
                ...fb,
                timestamp: new Date(fb.timestamp)
            }));
        } catch {
            return [];
        }
    }

    private saveFeedbackToStorage(feedbacks: SessionFeedback[]): void {
        try {
            localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbacks));
        } catch (error) {
            console.error('Failed to save feedback to storage:', error);
        }
    }

    getFeedbackForSession(sessionId: string): Observable<SessionFeedback | null> {
        const feedbacks = this.loadFeedbackFromStorage();
        const feedback = feedbacks.find(f => f.sessionId === sessionId) || null;
        return of(feedback);
    }

    submitFeedback(feedback: CreateSessionFeedback): Observable<{ success: boolean; feedbackId: string; timestamp: string }> {
        const feedbacks = this.loadFeedbackFromStorage();
        
        const newFeedback: SessionFeedback = {
            ...feedback,
            id: this.generateId(),
            timestamp: new Date()
        };
        
        feedbacks.push(newFeedback);
        this.saveFeedbackToStorage(feedbacks);
        
        return of({
            success: true,
            feedbackId: newFeedback.id,
            timestamp: newFeedback.timestamp.toISOString()
        });
    }

    getAllFeedback(filters?: FeedbackFilters): Observable<SessionFeedback[]> {
        let feedbacks = this.loadFeedbackFromStorage();
        
        if (filters) {
            if (filters.minAccuracy !== undefined) {
                feedbacks = feedbacks.filter(f => f.overallAccuracy >= filters.minAccuracy!);
            }
            if (filters.maxAccuracy !== undefined) {
                feedbacks = feedbacks.filter(f => f.overallAccuracy <= filters.maxAccuracy!);
            }
            if (filters.taskCompleted !== undefined) {
                feedbacks = feedbacks.filter(f => f.taskCompleted === filters.taskCompleted);
            }
            if (filters.taskCategory) {
                feedbacks = feedbacks.filter(f => f.taskCategory === filters.taskCategory);
            }
            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                feedbacks = feedbacks.filter(f => f.timestamp >= startDate);
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                feedbacks = feedbacks.filter(f => f.timestamp <= endDate);
            }
        }
        
        return of(feedbacks);
    }

    updateFeedback(feedbackId: string, updates: Partial<Omit<SessionFeedback, 'id' | 'timestamp'>>): Observable<SessionFeedback | null> {
        const feedbacks = this.loadFeedbackFromStorage();
        const index = feedbacks.findIndex(f => f.id === feedbackId);
        
        if (index === -1) {
            return of(null);
        }
        
        feedbacks[index] = {
            ...feedbacks[index],
            ...updates
        };
        
        this.saveFeedbackToStorage(feedbacks);
        return of(feedbacks[index]);
    }

    deleteFeedback(feedbackId: string): Observable<{ success: boolean }> {
        const feedbacks = this.loadFeedbackFromStorage();
        const filtered = feedbacks.filter(f => f.id !== feedbackId);
        
        if (filtered.length === feedbacks.length) {
            return of({ success: false });
        }
        
        this.saveFeedbackToStorage(filtered);
        return of({ success: true });
    }

    private generateId(): string {
        return `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
