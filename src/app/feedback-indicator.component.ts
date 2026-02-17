import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionFeedback } from './feedback-types';

@Component({
  selector: 'app-feedback-indicator',
  imports: [CommonModule],
  template: `
    @if (feedback) {
      <div class="feedback-indicator" [title]="getTooltip()">
        <span class="icon">✓</span>
        <span class="rating">{{ feedback!.overallAccuracy }}/5</span>
      </div>
    } @else {
      <div class="no-feedback-indicator" title="No feedback yet">
        <span class="icon">○</span>
      </div>
    }
  `,
  styles: [`
    .feedback-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #28a745;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .no-feedback-indicator {
      display: inline-flex;
      align-items: center;
      background: #e0e0e0;
      color: #999;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
    }

    .icon {
      font-size: 12px;
    }

    .rating {
      font-size: 10px;
    }
  `]
})
export class FeedbackIndicatorComponent {
  @Input({ required: true }) feedback!: SessionFeedback | null;

  getTooltip(): string {
    if (!this.feedback) return 'No feedback';
    return `Feedback: ${this.feedback.overallAccuracy}/5 accuracy, ${this.feedback.taskCompleted ? 'Completed' : 'Not completed'}`;
  }
}
