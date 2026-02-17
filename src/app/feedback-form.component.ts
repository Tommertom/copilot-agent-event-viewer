import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateSessionFeedback, PromptFeedback, TASK_CATEGORIES, ISSUE_TYPES } from './feedback-types';
import { Session } from './api.service';

@Component({
  selector: 'app-feedback-form',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feedback-overlay" (click)="onCancel()">
      <div class="feedback-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>📝 Provide Feedback</h2>
          <button class="close-btn" (click)="onCancel()" title="Close">✕</button>
        </div>

        <div class="modal-body">
          <div class="session-info-box">
            <div class="info-row">
              <span class="label">Session ID:</span>
              <code>{{ session?.sessionId?.substring(0, 8) || 'N/A' }}...</code>
            </div>
            <div class="info-row">
              <span class="label">Events:</span>
              <span>{{ session?.events?.length || 0 }}</span>
            </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span>{{ formatDate(session?.startTime) }}</span>
            </div>
          </div>

          <form class="feedback-form">
            <!-- Required Ratings -->
            <div class="form-section">
              <h3>Overall Evaluation <span class="required">*</span></h3>
              
              <div class="form-group">
                <label>Accuracy of Responses</label>
                <div class="rating-container">
                  <input type="range" min="1" max="5" step="1" [(ngModel)]="formData.overallAccuracy" name="accuracy" class="rating-slider">
                  <div class="rating-labels">
                    <span [class.active]="formData.overallAccuracy === 1">1 - Very Inaccurate</span>
                    <span [class.active]="formData.overallAccuracy === 2">2 - Inaccurate</span>
                    <span [class.active]="formData.overallAccuracy === 3">3 - Neutral</span>
                    <span [class.active]="formData.overallAccuracy === 4">4 - Accurate</span>
                    <span [class.active]="formData.overallAccuracy === 5">5 - Very Accurate</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Overall Satisfaction</label>
                <div class="rating-container">
                  <input type="range" min="1" max="5" step="1" [(ngModel)]="formData.overallSatisfaction" name="satisfaction" class="rating-slider">
                  <div class="rating-labels">
                    <span [class.active]="formData.overallSatisfaction === 1">1 - Very Unsatisfied</span>
                    <span [class.active]="formData.overallSatisfaction === 2">2 - Unsatisfied</span>
                    <span [class.active]="formData.overallSatisfaction === 3">3 - Neutral</span>
                    <span [class.active]="formData.overallSatisfaction === 4">4 - Satisfied</span>
                    <span [class.active]="formData.overallSatisfaction === 5">5 - Very Satisfied</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Task Completion -->
            <div class="form-section">
              <h3>Task Completion</h3>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="formData.taskCompleted" name="taskCompleted">
                  Task was completed successfully
                </label>
              </div>

              @if (formData.taskCompleted) {
                <div class="form-group">
                  <label>Task Completion Notes</label>
                  <textarea [(ngModel)]="formData.taskCompletionNotes" name="taskCompletionNotes" rows="3" placeholder="Describe how the task was completed..."></textarea>
                </div>
              }

              <div class="form-group">
                <label>Task Category</label>
                <select [(ngModel)]="formData.taskCategory" name="taskCategory">
                  <option value="">Select a category...</option>
                  @for (category of taskCategories; track category) {
                    <option [value]="category">{{ formatCategory(category) }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Task Complexity</label>
                <select [(ngModel)]="formData.complexity" name="complexity">
                  <option value="">Select complexity...</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <!-- Optional Quality Metrics -->
            <div class="form-section">
              <h3>Quality Metrics (Optional)</h3>
              
              <div class="form-group">
                <label>Code Quality</label>
                <input type="range" min="1" max="5" step="1" [(ngModel)]="formData.codeQuality" name="codeQuality" class="rating-slider">
                <span class="rating-value">{{ formData.codeQuality || 'Not rated' }}</span>
              </div>

              <div class="form-group">
                <label>Response Relevance</label>
                <input type="range" min="1" max="5" step="1" [(ngModel)]="formData.responseRelevance" name="responseRelevance" class="rating-slider">
                <span class="rating-value">{{ formData.responseRelevance || 'Not rated' }}</span>
              </div>

              <div class="form-group">
                <label>Efficiency</label>
                <input type="range" min="1" max="5" step="1" [(ngModel)]="formData.efficiency" name="efficiency" class="rating-slider">
                <span class="rating-value">{{ formData.efficiency || 'Not rated' }}</span>
              </div>
            </div>

            <!-- Qualitative Feedback -->
            <div class="form-section">
              <h3>Qualitative Feedback</h3>
              
              <div class="form-group">
                <label>What Worked Well?</label>
                <textarea [(ngModel)]="formData.whatWorkedWell" name="whatWorkedWell" rows="3" placeholder="Describe what aspects of the session were helpful..."></textarea>
              </div>

              <div class="form-group">
                <label>What Needs Improvement?</label>
                <textarea [(ngModel)]="formData.whatNeedsImprovement" name="whatNeedsImprovement" rows="3" placeholder="Describe what could be improved..."></textarea>
              </div>

              <div class="form-group">
                <label>Additional Comments</label>
                <textarea [(ngModel)]="formData.additionalComments" name="additionalComments" rows="3" placeholder="Any other feedback..."></textarea>
              </div>
            </div>

            @if (showPromptFeedback()) {
              <div class="form-section">
                <h3>Per-Prompt Feedback</h3>
                <p class="section-description">Provide detailed feedback for individual prompts in this session</p>
                
                @for (prompt of promptsInSession(); track prompt.index; let i = $index) {
                  <div class="prompt-feedback-item">
                    <div class="prompt-header">
                      <strong>Prompt {{ prompt.index + 1 }}</strong>
                      <button type="button" class="toggle-btn" (click)="togglePromptFeedback(i)">
                        {{ promptFeedbackExpanded[i] ? '▼' : '▶' }}
                      </button>
                    </div>
                    <div class="prompt-preview">{{ truncate(prompt.text, 100) }}</div>
                    
                    @if (promptFeedbackExpanded[i]) {
                      <div class="prompt-feedback-form">
                        <div class="form-group-inline">
                          <label>Accuracy (1-5)</label>
                          <input type="number" min="1" max="5" 
                            [(ngModel)]="prompt.feedback.responseAccuracy" 
                            [name]="'promptAccuracy' + i">
                        </div>
                        
                        <div class="form-group-inline">
                          <label class="checkbox-label">
                            <input type="checkbox" 
                              [(ngModel)]="prompt.feedback.responseHelpful" 
                              [name]="'promptHelpful' + i">
                            Response was helpful
                          </label>
                        </div>

                        <div class="form-group">
                          <label>Issues (select all that apply)</label>
                          <div class="checkbox-group">
                            @for (issue of issueTypes; track issue) {
                              <label class="checkbox-label">
                                <input type="checkbox" 
                                  [checked]="prompt.feedback.issues?.includes(issue)"
                                  (change)="toggleIssue(prompt.feedback, issue)">
                                {{ formatIssue(issue) }}
                              </label>
                            }
                          </div>
                        </div>

                        <div class="form-group">
                          <label>Notes</label>
                          <textarea [(ngModel)]="prompt.feedback.notes" 
                            [name]="'promptNotes' + i" 
                            rows="2" 
                            placeholder="Additional notes for this prompt..."></textarea>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="onCancel()">Cancel</button>
          @if (!showPromptFeedback()) {
            <button class="btn-link" (click)="enablePromptFeedback()">+ Add Per-Prompt Feedback</button>
          }
          <button class="btn-primary" (click)="onSubmit()" [disabled]="!isValid()">
            Submit Feedback
          </button>
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

    .feedback-modal {
      background: white;
      border-radius: 12px;
      max-width: 700px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 24px;
      color: #1a1a1a;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 4px 8px;
      line-height: 1;
    }

    .close-btn:hover {
      color: #000;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .session-info-box {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .info-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-row .label {
      font-weight: 600;
      color: #666;
    }

    .form-section {
      margin-bottom: 32px;
    }

    .form-section h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 8px;
    }

    .section-description {
      color: #666;
      font-size: 14px;
      margin: -8px 0 16px 0;
    }

    .required {
      color: #e53e3e;
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

    .form-group input[type="text"],
    .form-group select,
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

    .rating-container {
      margin-top: 8px;
    }

    .rating-slider {
      width: 100%;
      margin-bottom: 12px;
    }

    .rating-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
    }

    .rating-labels span {
      flex: 1;
      text-align: center;
      padding: 4px;
      border-radius: 4px;
    }

    .rating-labels span.active {
      background: #007bff;
      color: white;
      font-weight: 600;
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

    .checkbox-group {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    }

    .form-group-inline {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .form-group-inline label {
      margin-bottom: 0;
      white-space: nowrap;
    }

    .form-group-inline input[type="number"] {
      width: 80px;
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .prompt-feedback-item {
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .prompt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .prompt-preview {
      font-size: 14px;
      color: #666;
      font-style: italic;
      margin-bottom: 12px;
    }

    .toggle-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      color: #007bff;
    }

    .prompt-feedback-form {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      align-items: center;
    }

    .btn-primary,
    .btn-secondary,
    .btn-link {
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

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #e0e0e0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #d0d0d0;
    }

    .btn-link {
      background: none;
      color: #007bff;
      text-decoration: underline;
    }

    .btn-link:hover {
      color: #0056b3;
    }
  `]
})
export class FeedbackFormComponent implements OnInit {
  @Input({ required: true }) session!: Session | null;
  @Output() submit = new EventEmitter<CreateSessionFeedback>();
  @Output() cancel = new EventEmitter<void>();

  taskCategories = TASK_CATEGORIES;
  issueTypes = ISSUE_TYPES;
  showPromptFeedback = signal(false);
  promptFeedbackExpanded: boolean[] = [];

  formData: CreateSessionFeedback = {
    sessionId: '',
    overallAccuracy: 3,
    overallSatisfaction: 3,
    taskCompleted: false
  };

  promptsInSession = signal<Array<{ index: number; text: string; feedback: PromptFeedback }>>([]);

  ngOnInit() {
    if (this.session) {
      this.formData.sessionId = this.session.sessionId;
      this.extractPrompts();
    }
  }

  extractPrompts() {
    if (!this.session) return;

    const prompts: Array<{ index: number; text: string; feedback: PromptFeedback }> = [];
    let promptIndex = 0;

    this.session.events.forEach(event => {
      if (event.content.hookName === 'userPromptSubmitted') {
        const promptText = (event.content.input as any).prompt || '';
        prompts.push({
          index: promptIndex,
          text: promptText,
          feedback: {
            promptIndex,
            promptText,
            responseAccuracy: 3,
            responseHelpful: true,
            issues: []
          }
        });
        promptIndex++;
        this.promptFeedbackExpanded.push(false);
      }
    });

    this.promptsInSession.set(prompts);
  }

  enablePromptFeedback() {
    this.showPromptFeedback.set(true);
  }

  togglePromptFeedback(index: number) {
    this.promptFeedbackExpanded[index] = !this.promptFeedbackExpanded[index];
  }

  toggleIssue(feedback: PromptFeedback, issue: string) {
    if (!feedback.issues) {
      feedback.issues = [];
    }
    const index = feedback.issues.indexOf(issue);
    if (index > -1) {
      feedback.issues.splice(index, 1);
    } else {
      feedback.issues.push(issue);
    }
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

  formatDate(date: string | undefined): string {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString();
  }

  isValid(): boolean {
    return this.formData.overallAccuracy >= 1 && 
           this.formData.overallAccuracy <= 5 &&
           this.formData.overallSatisfaction >= 1 && 
           this.formData.overallSatisfaction <= 5;
  }

  onSubmit() {
    if (!this.isValid()) return;

    // Include prompt feedback if enabled
    if (this.showPromptFeedback()) {
      this.formData.promptFeedback = this.promptsInSession()
        .map(p => p.feedback)
        .filter(fb => fb.responseAccuracy > 0); // Only include rated prompts
    }

    this.submit.emit(this.formData);
  }

  onCancel() {
    this.cancel.emit();
  }
}
