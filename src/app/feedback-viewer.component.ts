import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionFeedback, TASK_CATEGORIES } from './feedback-types';

@Component({
  selector: 'app-feedback-viewer',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feedback-overlay" (click)="onClose()">
      <div class="feedback-viewer" (click)="$event.stopPropagation()">
        <div class="viewer-header">
          <h2>📊 Session Feedback</h2>
          <div class="header-actions">
            @if (!editing) {
              <button class="btn-edit" (click)="startEditing()">✏️ Edit</button>
            }
            <button class="btn-close" (click)="onClose()">✕</button>
          </div>
        </div>

        <div class="viewer-body">
          @if (!editing) {
            <!-- View Mode -->
            <div class="feedback-section">
              <h3>Overall Ratings</h3>
              <div class="rating-display">
                <div class="rating-item">
                  <span class="label">Accuracy:</span>
                  <span class="stars">{{ getStars(feedback.overallAccuracy) }}</span>
                  <span class="value">{{ feedback.overallAccuracy }}/5</span>
                </div>
                <div class="rating-item">
                  <span class="label">Satisfaction:</span>
                  <span class="stars">{{ getStars(feedback.overallSatisfaction) }}</span>
                  <span class="value">{{ feedback.overallSatisfaction }}/5</span>
                </div>
              </div>
            </div>

            <div class="feedback-section">
              <h3>Task Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Status:</span>
                  <span class="badge" [class.success]="feedback.taskCompleted" [class.pending]="!feedback.taskCompleted">
                    {{ feedback.taskCompleted ? '✓ Completed' : '○ Not Completed' }}
                  </span>
                </div>
                @if (feedback.taskCategory) {
                  <div class="info-item">
                    <span class="label">Category:</span>
                    <span>{{ formatCategory(feedback.taskCategory) }}</span>
                  </div>
                }
                @if (feedback.complexity) {
                  <div class="info-item">
                    <span class="label">Complexity:</span>
                    <span>{{ feedback.complexity }}</span>
                  </div>
                }
              </div>
              @if (feedback.taskCompletionNotes) {
                <div class="notes-box">
                  <strong>Completion Notes:</strong>
                  <p>{{ feedback.taskCompletionNotes }}</p>
                </div>
              }
            </div>

            @if (feedback.codeQuality || feedback.responseRelevance || feedback.efficiency) {
              <div class="feedback-section">
                <h3>Quality Metrics</h3>
                <div class="rating-display">
                  @if (feedback.codeQuality) {
                    <div class="rating-item">
                      <span class="label">Code Quality:</span>
                      <span class="stars">{{ getStars(feedback.codeQuality) }}</span>
                      <span class="value">{{ feedback.codeQuality }}/5</span>
                    </div>
                  }
                  @if (feedback.responseRelevance) {
                    <div class="rating-item">
                      <span class="label">Response Relevance:</span>
                      <span class="stars">{{ getStars(feedback.responseRelevance) }}</span>
                      <span class="value">{{ feedback.responseRelevance }}/5</span>
                    </div>
                  }
                  @if (feedback.efficiency) {
                    <div class="rating-item">
                      <span class="label">Efficiency:</span>
                      <span class="stars">{{ getStars(feedback.efficiency) }}</span>
                      <span class="value">{{ feedback.efficiency }}/5</span>
                    </div>
                  }
                </div>
              </div>
            }

            @if (feedback.whatWorkedWell || feedback.whatNeedsImprovement || feedback.additionalComments) {
              <div class="feedback-section">
                <h3>Comments</h3>
                @if (feedback.whatWorkedWell) {
                  <div class="comment-box success">
                    <strong>✓ What Worked Well:</strong>
                    <p>{{ feedback.whatWorkedWell }}</p>
                  </div>
                }
                @if (feedback.whatNeedsImprovement) {
                  <div class="comment-box warning">
                    <strong>⚠ Needs Improvement:</strong>
                    <p>{{ feedback.whatNeedsImprovement }}</p>
                  </div>
                }
                @if (feedback.additionalComments) {
                  <div class="comment-box info">
                    <strong>💬 Additional Comments:</strong>
                    <p>{{ feedback.additionalComments }}</p>
                  </div>
                }
              </div>
            }

            @if (feedback.promptFeedback && feedback.promptFeedback.length > 0) {
              <div class="feedback-section">
                <h3>Per-Prompt Feedback</h3>
                @for (pf of feedback.promptFeedback; track pf.promptIndex) {
                  <div class="prompt-feedback-card">
                    <div class="prompt-feedback-header">
                      <strong>Prompt {{ pf.promptIndex + 1 }}</strong>
                      <span class="prompt-rating">{{ getStars(pf.responseAccuracy) }} {{ pf.responseAccuracy }}/5</span>
                    </div>
                    <div class="prompt-text">{{ truncate(pf.promptText, 150) }}</div>
                    @if (pf.issues && pf.issues.length > 0) {
                      <div class="issues-list">
                        <strong>Issues:</strong>
                        @for (issue of pf.issues; track issue) {
                          <span class="issue-tag">{{ formatIssue(issue) }}</span>
                        }
                      </div>
                    }
                    @if (pf.notes) {
                      <div class="prompt-notes">{{ pf.notes }}</div>
                    }
                  </div>
                }
              </div>
            }

            <div class="feedback-meta">
              <small>Submitted: {{ formatDate(feedback.timestamp) }}</small>
            </div>
          } @else {
            <!-- Edit Mode -->
            <div class="edit-notice">
              <p>Editing feedback - changes will be saved when you click Update</p>
            </div>

            <div class="form-group">
              <label>Overall Accuracy (1-5)</label>
              <input type="range" min="1" max="5" step="1" [(ngModel)]="editData.overallAccuracy" class="rating-slider">
              <span class="rating-value">{{ editData.overallAccuracy }}/5</span>
            </div>

            <div class="form-group">
              <label>Overall Satisfaction (1-5)</label>
              <input type="range" min="1" max="5" step="1" [(ngModel)]="editData.overallSatisfaction" class="rating-slider">
              <span class="rating-value">{{ editData.overallSatisfaction }}/5</span>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="editData.taskCompleted">
                Task was completed successfully
              </label>
            </div>

            <div class="form-group">
              <label>What Worked Well?</label>
              <textarea [(ngModel)]="editData.whatWorkedWell" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>What Needs Improvement?</label>
              <textarea [(ngModel)]="editData.whatNeedsImprovement" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>Additional Comments</label>
              <textarea [(ngModel)]="editData.additionalComments" rows="3"></textarea>
            </div>
          }
        </div>

        <div class="viewer-footer">
          @if (editing) {
            <button class="btn-secondary" (click)="cancelEditing()">Cancel</button>
            <button class="btn-primary" (click)="saveEdits()">Update Feedback</button>
          } @else {
            <button class="btn-danger" (click)="onDelete()">🗑 Delete Feedback</button>
            <button class="btn-secondary" (click)="onClose()">Close</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .feedback-overlay {
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

    .feedback-viewer {
      background: white;
      border-radius: 12px;
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .viewer-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .viewer-header h2 {
      margin: 0;
      font-size: 24px;
      color: #1a1a1a;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .btn-edit, .btn-close {
      background: none;
      border: 1px solid #ddd;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-edit {
      color: #007bff;
      border-color: #007bff;
    }

    .btn-edit:hover {
      background: #007bff;
      color: white;
    }

    .btn-close {
      color: #666;
    }

    .btn-close:hover {
      background: #f0f0f0;
    }

    .viewer-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .feedback-section {
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #f0f0f0;
    }

    .feedback-section:last-child {
      border-bottom: none;
    }

    .feedback-section h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #333;
    }

    .rating-display {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .rating-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: #f9f9f9;
      border-radius: 6px;
    }

    .rating-item .label {
      font-weight: 500;
      color: #666;
      min-width: 140px;
    }

    .stars {
      color: #fbbf24;
      font-size: 18px;
      letter-spacing: 2px;
    }

    .rating-item .value {
      margin-left: auto;
      font-weight: 600;
      color: #007bff;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-item .label {
      font-weight: 500;
      color: #666;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
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

    .notes-box, .comment-box {
      margin-top: 12px;
      padding: 12px;
      border-radius: 6px;
      background: #f9f9f9;
      border-left: 4px solid #ddd;
    }

    .comment-box.success {
      background: #f0fdf4;
      border-left-color: #22c55e;
    }

    .comment-box.warning {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }

    .comment-box.info {
      background: #eff6ff;
      border-left-color: #3b82f6;
    }

    .comment-box strong, .notes-box strong {
      display: block;
      margin-bottom: 8px;
      color: #333;
    }

    .comment-box p, .notes-box p {
      margin: 0;
      color: #666;
      line-height: 1.6;
    }

    .prompt-feedback-card {
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .prompt-feedback-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .prompt-rating {
      color: #fbbf24;
      font-size: 14px;
    }

    .prompt-text {
      color: #666;
      font-size: 14px;
      font-style: italic;
      margin-bottom: 12px;
      padding: 8px;
      background: white;
      border-radius: 4px;
    }

    .issues-list {
      margin-bottom: 8px;
    }

    .issues-list strong {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      color: #333;
    }

    .issue-tag {
      display: inline-block;
      background: #fee2e2;
      color: #991b1b;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 6px;
      margin-bottom: 4px;
    }

    .prompt-notes {
      color: #666;
      font-size: 14px;
      padding: 8px;
      background: white;
      border-radius: 4px;
    }

    .feedback-meta {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
      color: #999;
      text-align: center;
    }

    .edit-notice {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 4px;
    }

    .edit-notice p {
      margin: 0;
      color: #1e40af;
      font-weight: 500;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    }

    .form-group input[type="range"],
    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }

    .form-group textarea {
      resize: vertical;
    }

    .rating-slider {
      margin-bottom: 8px;
    }

    .rating-value {
      display: inline-block;
      margin-left: 12px;
      font-weight: 600;
      color: #007bff;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 400;
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
      cursor: pointer;
    }

    .viewer-footer {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn-primary, .btn-secondary, .btn-danger {
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

    .btn-danger {
      background: #dc3545;
      color: white;
      margin-right: auto;
    }

    .btn-danger:hover {
      background: #c82333;
    }
  `]
})
export class FeedbackViewerComponent implements OnInit {
  @Input({ required: true }) feedback!: SessionFeedback;
  @Output() close = new EventEmitter<void>();
  @Output() update = new EventEmitter<Partial<SessionFeedback>>();
  @Output() delete = new EventEmitter<void>();

  editing = false;
  editData: any = {};

  ngOnInit() {
    this.resetEditData();
  }

  resetEditData() {
    this.editData = {
      overallAccuracy: this.feedback.overallAccuracy,
      overallSatisfaction: this.feedback.overallSatisfaction,
      taskCompleted: this.feedback.taskCompleted,
      whatWorkedWell: this.feedback.whatWorkedWell || '',
      whatNeedsImprovement: this.feedback.whatNeedsImprovement || '',
      additionalComments: this.feedback.additionalComments || ''
    };
  }

  startEditing() {
    this.editing = true;
    this.resetEditData();
  }

  cancelEditing() {
    this.editing = false;
    this.resetEditData();
  }

  saveEdits() {
    this.update.emit(this.editData);
    this.editing = false;
  }

  onClose() {
    this.close.emit();
  }

  onDelete() {
    if (confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      this.delete.emit();
    }
  }

  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  formatCategory(category: string): string {
    return category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  formatIssue(issue: string): string {
    return issue.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  truncate(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }
}
