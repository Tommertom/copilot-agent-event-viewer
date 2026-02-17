import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CopilotEvent } from './copilot-event-types';

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
}
