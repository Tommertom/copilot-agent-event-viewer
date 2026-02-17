import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionFeedback, FeedbackFilters, TASK_CATEGORIES } from './feedback-types';

interface FeedbackStats {
  totalFeedback: number;
  avgAccuracy: number;
  avgSatisfaction: number;
  completionRate: number;
  byCategory: { [key: string]: number };
  recentTrends: { date: string; accuracy: number; satisfaction: number }[];
}

@Component({
  selector: 'app-feedback-analytics',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="analytics-overlay" (click)="onClose()">
      <div class="analytics-panel" (click)="$event.stopPropagation()">
        <div class="panel-header">
          <h2>📊 Feedback Analytics</h2>
          <button class="btn-close" (click)="onClose()">✕</button>
        </div>

        <div class="panel-body">
          <!-- Summary Stats -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ stats().totalFeedback }}</div>
              <div class="stat-label">Total Feedback</div>
            </div>
            <div class="stat-card highlight">
              <div class="stat-value">{{ stats().avgAccuracy.toFixed(2) }}</div>
              <div class="stat-label">Avg Accuracy</div>
              <div class="stat-stars">{{ getStars(Math.round(stats().avgAccuracy)) }}</div>
            </div>
            <div class="stat-card highlight">
              <div class="stat-value">{{ stats().avgSatisfaction.toFixed(2) }}</div>
              <div class="stat-label">Avg Satisfaction</div>
              <div class="stat-stars">{{ getStars(Math.round(stats().avgSatisfaction)) }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats().completionRate.toFixed(0) }}%</div>
              <div class="stat-label">Completion Rate</div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <h3>Filters</h3>
            <div class="filters-grid">
              <div class="filter-group">
                <label>Task Category</label>
                <select [(ngModel)]="filters.taskCategory" (ngModelChange)="applyFilters()">
                  <option value="">All Categories</option>
                  @for (category of categories; track category) {
                    <option [value]="category">{{ formatCategory(category) }}</option>
                  }
                </select>
              </div>

              <div class="filter-group">
                <label>Min Accuracy</label>
                <select [(ngModel)]="filters.minAccuracy" (ngModelChange)="applyFilters()">
                  <option [value]="undefined">Any</option>
                  <option [value]="1">1+ ⭐</option>
                  <option [value]="2">2+ ⭐⭐</option>
                  <option [value]="3">3+ ⭐⭐⭐</option>
                  <option [value]="4">4+ ⭐⭐⭐⭐</option>
                  <option [value]="5">5 ⭐⭐⭐⭐⭐</option>
                </select>
              </div>

              <div class="filter-group">
                <label>Task Status</label>
                <select [(ngModel)]="filters.taskCompleted" (ngModelChange)="applyFilters()">
                  <option [value]="undefined">All</option>
                  <option [value]="true">Completed</option>
                  <option [value]="false">Not Completed</option>
                </select>
              </div>

              @if (hasActiveFilters()) {
                <div class="filter-group">
                  <button class="btn-clear-filters" (click)="clearFilters()">Clear Filters</button>
                </div>
              }
            </div>

            @if (hasActiveFilters()) {
              <div class="filter-results">
                Showing {{ filteredFeedback().length }} of {{ allFeedback.length }} feedback entries
              </div>
            }
          </div>

          <!-- Category Breakdown -->
          @if (Object.keys(stats().byCategory).length > 0) {
            <div class="category-section">
              <h3>Feedback by Category</h3>
              <div class="category-list">
                @for (entry of getCategoryEntries(); track entry.category) {
                  <div class="category-item">
                    <div class="category-name">{{ formatCategory(entry.category) }}</div>
                    <div class="category-bar-container">
                      <div class="category-bar" [style.width.%]="(entry.count / stats().totalFeedback) * 100"></div>
                    </div>
                    <div class="category-count">{{ entry.count }}</div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Recent Trends -->
          @if (stats().recentTrends.length > 0) {
            <div class="trends-section">
              <h3>Recent Trends</h3>
              <div class="trends-table">
                <div class="trends-header">
                  <div>Date</div>
                  <div>Accuracy</div>
                  <div>Satisfaction</div>
                </div>
                @for (trend of stats().recentTrends.slice(0, 10); track trend.date) {
                  <div class="trend-row">
                    <div>{{ trend.date }}</div>
                    <div>{{ getStars(Math.round(trend.accuracy)) }} {{ trend.accuracy.toFixed(1) }}</div>
                    <div>{{ getStars(Math.round(trend.satisfaction)) }} {{ trend.satisfaction.toFixed(1) }}</div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Filtered Feedback List -->
          <div class="feedback-list-section">
            <h3>Feedback Entries ({{ filteredFeedback().length }})</h3>
            @if (filteredFeedback().length === 0) {
              <div class="empty-state">No feedback matches the current filters</div>
            } @else {
              <div class="feedback-list">
                @for (fb of filteredFeedback(); track fb.id) {
                  <div class="feedback-item" (click)="onSelectFeedback(fb)">
                    <div class="feedback-item-header">
                      <span class="feedback-session-id">{{ fb.sessionId.substring(0, 8) }}...</span>
                      <span class="feedback-date">{{ formatDate(fb.timestamp) }}</span>
                    </div>
                    <div class="feedback-item-body">
                      <div class="feedback-ratings">
                        <span>{{ getStars(fb.overallAccuracy) }} Accuracy</span>
                        <span>{{ getStars(fb.overallSatisfaction) }} Satisfaction</span>
                      </div>
                      <div class="feedback-status">
                        <span class="badge" [class.success]="fb.taskCompleted" [class.pending]="!fb.taskCompleted">
                          {{ fb.taskCompleted ? '✓ Completed' : '○ Pending' }}
                        </span>
                        @if (fb.taskCategory) {
                          <span class="category-badge">{{ formatCategory(fb.taskCategory) }}</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="panel-footer">
          <button class="btn-secondary" (click)="onClose()">Close</button>
          <button class="btn-primary" (click)="onExport()">Export Data</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .analytics-panel {
      background: white;
      border-radius: 12px;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .panel-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 24px;
      color: #1a1a1a;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 4px 8px;
    }

    .btn-close:hover {
      color: #000;
    }

    .panel-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: #f9f9f9;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }

    .stat-card.highlight {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 14px;
      font-weight: 500;
      opacity: 0.9;
    }

    .stat-stars {
      font-size: 18px;
      margin-top: 8px;
      color: #fbbf24;
    }

    .stat-card.highlight .stat-stars {
      color: #fde047;
    }

    .filters-section, .category-section, .trends-section, .feedback-list-section {
      margin-bottom: 32px;
    }

    .filters-section h3, .category-section h3, .trends-section h3, .feedback-list-section h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 8px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .filter-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .filter-group select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }

    .btn-clear-filters {
      width: 100%;
      padding: 8px 12px;
      background: #e0e0e0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      margin-top: 24px;
    }

    .btn-clear-filters:hover {
      background: #d0d0d0;
    }

    .filter-results {
      margin-top: 12px;
      padding: 8px 12px;
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
      color: #1e40af;
      font-size: 14px;
      font-weight: 500;
    }

    .category-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .category-item {
      display: grid;
      grid-template-columns: 150px 1fr 60px;
      align-items: center;
      gap: 12px;
    }

    .category-name {
      font-weight: 500;
      color: #333;
    }

    .category-bar-container {
      background: #f0f0f0;
      height: 24px;
      border-radius: 12px;
      overflow: hidden;
    }

    .category-bar {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      height: 100%;
      border-radius: 12px;
      transition: width 0.3s ease;
    }

    .category-count {
      text-align: right;
      font-weight: 600;
      color: #667eea;
    }

    .trends-table {
      background: #f9f9f9;
      border-radius: 8px;
      overflow: hidden;
    }

    .trends-header, .trend-row {
      display: grid;
      grid-template-columns: 120px 1fr 1fr;
      gap: 12px;
      padding: 12px 16px;
    }

    .trends-header {
      background: #e0e0e0;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .trend-row {
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }

    .trend-row:last-child {
      border-bottom: none;
    }

    .trend-row:hover {
      background: #f0f0f0;
    }

    .feedback-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .feedback-item {
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .feedback-item:hover {
      border-color: #007bff;
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
      transform: translateX(4px);
    }

    .feedback-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .feedback-session-id {
      font-family: monospace;
      font-weight: 600;
      color: #007bff;
    }

    .feedback-date {
      font-size: 12px;
      color: #999;
    }

    .feedback-item-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .feedback-ratings {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: #666;
    }

    .feedback-ratings span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .feedback-status {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .badge.success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .category-badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
      font-size: 14px;
    }

    .panel-footer {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn-primary, .btn-secondary {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #e0e0e0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #d0d0d0;
    }
  `]
})
export class FeedbackAnalyticsComponent {
  @Input({ required: true }) allFeedback!: SessionFeedback[];
  @Output() close = new EventEmitter<void>();
  @Output() selectFeedback = new EventEmitter<SessionFeedback>();
  @Output() exportData = new EventEmitter<SessionFeedback[]>();

  categories = TASK_CATEGORIES;
  filters: FeedbackFilters = {};
  Math = Math; // Make Math available in template
  Object = Object; // Make Object available in template
  
  filteredFeedback = computed(() => {
    let feedbacks = this.allFeedback;
    
    if (this.filters.minAccuracy !== undefined) {
      feedbacks = feedbacks.filter(f => f.overallAccuracy >= this.filters.minAccuracy!);
    }
    if (this.filters.taskCompleted !== undefined) {
      feedbacks = feedbacks.filter(f => f.taskCompleted === this.filters.taskCompleted);
    }
    if (this.filters.taskCategory) {
      feedbacks = feedbacks.filter(f => f.taskCategory === this.filters.taskCategory);
    }
    
    return feedbacks;
  });

  stats = computed((): FeedbackStats => {
    const feedbacks = this.filteredFeedback();
    
    if (feedbacks.length === 0) {
      return {
        totalFeedback: 0,
        avgAccuracy: 0,
        avgSatisfaction: 0,
        completionRate: 0,
        byCategory: {},
        recentTrends: []
      };
    }

    const totalAccuracy = feedbacks.reduce((sum, f) => sum + f.overallAccuracy, 0);
    const totalSatisfaction = feedbacks.reduce((sum, f) => sum + f.overallSatisfaction, 0);
    const completed = feedbacks.filter(f => f.taskCompleted).length;

    const byCategory: { [key: string]: number } = {};
    feedbacks.forEach(f => {
      if (f.taskCategory) {
        byCategory[f.taskCategory] = (byCategory[f.taskCategory] || 0) + 1;
      }
    });

    const sortedByDate = [...feedbacks].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const recentTrends = sortedByDate.map(f => ({
      date: new Date(f.timestamp).toLocaleDateString(),
      accuracy: f.overallAccuracy,
      satisfaction: f.overallSatisfaction
    }));

    return {
      totalFeedback: feedbacks.length,
      avgAccuracy: totalAccuracy / feedbacks.length,
      avgSatisfaction: totalSatisfaction / feedbacks.length,
      completionRate: (completed / feedbacks.length) * 100,
      byCategory,
      recentTrends
    };
  });

  getCategoryEntries(): Array<{ category: string; count: number }> {
    return Object.entries(this.stats().byCategory)
      .map(([category, count]) => ({ category, count: count as number }))
      .sort((a, b) => b.count - a.count);
  }

  hasActiveFilters(): boolean {
    return this.filters.minAccuracy !== undefined ||
           this.filters.taskCompleted !== undefined ||
           !!this.filters.taskCategory;
  }

  applyFilters() {
    // Force re-render - in a real app this would be better handled
    this.allFeedback = [...this.allFeedback];
  }

  clearFilters() {
    this.filters = {};
    this.applyFilters();
  }

  onClose() {
    this.close.emit();
  }

  onSelectFeedback(feedback: SessionFeedback) {
    this.selectFeedback.emit(feedback);
  }

  onExport() {
    this.exportData.emit(this.filteredFeedback());
  }

  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  formatCategory(category: string): string {
    return category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }
}
