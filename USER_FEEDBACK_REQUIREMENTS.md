# User Feedback Evaluation System - Requirements

## Overview

This document outlines the requirements for implementing a user feedback evaluation system in the Copilot Agent Event Viewer application. The system will capture user feedback on the accuracy and quality of AI-generated responses in each session, with the ultimate goal of feeding this data into a language model for recommendations and continuous improvement.

## Problem Statement

To improve the quality of AI agent interactions, we need to:
1. Capture structured user feedback on the accuracy and effectiveness of agent responses
2. Associate feedback with specific prompts and sessions
3. Store feedback data in a format suitable for language model training and analysis
4. Enable future integration with recommendation systems

## Requirements

### 1. Data Model Requirements

#### 1.1 Feedback Entity Structure

The feedback data model should capture the following information:

```typescript
interface SessionFeedback {
  id: string;                          // Unique feedback identifier (generated server-side)
  sessionId: string;                   // Reference to the Copilot session
  timestamp: Date;                     // Timestamp when feedback was submitted (Date type, serialized as ISO string for API)
  
  // Overall session evaluation
  overallAccuracy: number;             // Rating 1-5 (1=Very Inaccurate, 5=Very Accurate)
  overallSatisfaction: number;         // Rating 1-5 (1=Very Unsatisfied, 5=Very Satisfied)
  
  // Task completion assessment
  taskCompleted: boolean;              // Whether the task was completed successfully
  taskCompletionNotes?: string;        // Optional notes on task completion
  
  // Quality metrics
  codeQuality?: number;                // Rating 1-5 for code quality (if applicable)
  responseRelevance?: number;          // Rating 1-5 for relevance of responses
  efficiency?: number;                 // Rating 1-5 for efficiency (time/steps taken)
  
  // Qualitative feedback
  whatWorkedWell?: string;             // Free text: aspects that worked well
  whatNeedsImprovement?: string;       // Free text: areas for improvement
  additionalComments?: string;         // Free text: any additional feedback
  
  // Context metadata
  userRole?: string;                   // User's role (developer, tester, etc.)
  taskCategory?: string;               // Type of task (bug fix, feature, documentation, etc.)
  complexity?: 'low' | 'medium' | 'high';  // Task complexity
  
  // Prompt-specific feedback
  promptFeedback?: PromptFeedback[];   // Optional feedback on individual prompts
}

interface PromptFeedback {
  promptIndex: number;                 // Index of the prompt in the session
  promptText: string;                  // The actual prompt text
  responseAccuracy: number;            // Rating 1-5 for this specific response
  responseHelpful: boolean;            // Whether the response was helpful
  issues?: string[];                   // List of issues (e.g., "hallucination", "incomplete", "incorrect")
  notes?: string;                      // Additional notes for this prompt
}

// Separate type for creating new feedback (without server-generated fields)
interface CreateSessionFeedback extends Omit<SessionFeedback, 'id' | 'timestamp'> {
  // Client provides all fields except id and timestamp which are server-generated
}
```

#### 1.2 Storage Requirements

- Feedback data must be stored persistently
- Each feedback entry must be uniquely identifiable
- Feedback must be queryable by:
  - Session ID
  - Date range
  - Rating ranges
  - Task category
  - Completion status
- Data must be exportable in JSON format for language model training

### 2. User Interface Requirements

#### 2.1 Feedback Collection Interface

**Location**: Add a feedback section for each session view

**Components Required**:

1. **Feedback Button**
   - Display a "Provide Feedback" button for each session
   - Button should be prominently visible in the session detail view
   - Indicate if feedback has already been provided for a session

2. **Feedback Form Modal/Panel**
   - Open when user clicks "Provide Feedback"
   - Display session information (session ID, date, prompts count)
   - Include the following input fields:

   **Rating Scales** (1-5 stars or slider):
   - Overall accuracy of responses
   - Overall satisfaction with session
   - Code quality (if applicable)
   - Response relevance
   - Efficiency

   **Binary/Selection Inputs**:
   - Task completion status (checkbox or yes/no)
   - Task complexity dropdown (low/medium/high)
   - Task category dropdown (bug fix, feature, documentation, refactoring, etc.)

   **Text Inputs**:
   - What worked well? (textarea)
   - What needs improvement? (textarea)
   - Additional comments (textarea)
   - Task completion notes (textarea, conditional on task completion status)

3. **Per-Prompt Feedback** (Optional Advanced Feature)
   - Expandable section for detailed feedback on individual prompts
   - For each prompt in the session:
     - Display the prompt text
     - Accuracy rating (1-5)
     - Helpful checkbox
     - Issue tags (multiselect: hallucination, incomplete, incorrect, off-topic, etc.)
     - Notes field

4. **Form Validation**
   - Require at least overall accuracy and satisfaction ratings
   - Validate rating values are within range
   - Prevent submission of incomplete required fields

5. **Feedback Submission**
   - "Submit Feedback" button
   - "Cancel" button to close without saving
   - Display loading state during submission
   - Show success/error messages after submission
   - Close form on successful submission

#### 2.2 Feedback Display

1. **Feedback Indicator**
   - Display a visual indicator (badge, icon) on sessions that have feedback
   - Show average rating or completion status at a glance

2. **View Existing Feedback**
   - Allow users to view previously submitted feedback
   - Display read-only view of all feedback fields
   - Include timestamp of when feedback was submitted
   - Option to edit/update feedback

3. **Feedback Summary Dashboard** (Future Enhancement)
   - Aggregate statistics across all sessions
   - Charts/graphs showing:
     - Average accuracy over time
     - Completion rate trends
     - Common issues/improvement areas
     - Task category performance

### 3. API Requirements

#### 3.1 Backend Endpoints

The following API endpoints must be implemented:

1. **Submit Feedback**
   ```
   POST /api/feedback
   Body: CreateSessionFeedback (excludes id and timestamp - these are server-generated)
   Response: { success: boolean, feedbackId: string, timestamp: string }
   ```

2. **Get Feedback for Session**
   ```
   GET /api/feedback/session/:sessionId
   Response: SessionFeedback | null
   ```

3. **List All Feedback**
   ```
   GET /api/feedback
   Query params: 
     - page: number
     - limit: number
     - minAccuracy: number
     - maxAccuracy: number
     - taskCompleted: boolean
     - taskCategory: string
     - startDate: string
     - endDate: string
   Response: { feedbacks: SessionFeedback[], total: number, page: number }
   ```

4. **Update Feedback**
   ```
   PUT /api/feedback/:feedbackId
   Body: Partial<SessionFeedback>
   Response: { success: boolean, updated: SessionFeedback }
   ```

5. **Delete Feedback**
   ```
   DELETE /api/feedback/:feedbackId
   Response: { success: boolean }
   ```

6. **Export Feedback Data**
   ```
   GET /api/feedback/export
   Query params:
     - format: 'json' | 'csv'
     - startDate: string
     - endDate: string
   Response: File download or JSON array
   ```

#### 3.2 Data Storage

**Database Selection**:
- **PostgreSQL** (Recommended for production): Best for multi-user systems, strong ACID guarantees, excellent concurrent write support
- **SQLite** (Suitable for single-user/development): Lightweight, no separate server, but limited concurrent write support
- **MongoDB** (Alternative): Good for flexible schema evolution, but different transaction guarantees than relational databases

**Storage Requirements**:
- Implement proper indexing on sessionId, timestamp, and rating fields
- Ensure data integrity:
  - If sessions are stored in the same database: use foreign key constraints (sessionId references sessions)
  - If sessions and feedback are in separate data stores: implement application-level validation to verify sessionId exists before accepting feedback
- Implement backup and recovery mechanisms

### 4. Integration with Existing System

#### 4.1 Session Service Updates

Update `api.service.ts` to include feedback-related methods:

```typescript
// Add to ApiService
getFeedbackForSession(sessionId: string): Observable<SessionFeedback | null>
submitFeedback(feedback: CreateSessionFeedback): Observable<{ success: boolean, feedbackId: string }>  // Note: uses CreateSessionFeedback to prevent client-provided id
getAllFeedback(filters?: FeedbackFilters): Observable<SessionFeedback[]>
updateFeedback(feedbackId: string, updates: Partial<Omit<SessionFeedback, 'id' | 'timestamp'>>): Observable<SessionFeedback>  // Prevent updating id/timestamp
deleteFeedback(feedbackId: string): Observable<{ success: boolean }>
exportFeedback(format: 'json' | 'csv', dateRange?: DateRange): Observable<Blob>
```

#### 4.2 TypeScript Type Definitions

Create `feedback-types.ts` with the interfaces defined in section 1.1

#### 4.3 UI Component Structure

Suggested new components:
- `FeedbackFormComponent` - Modal/panel for submitting feedback
- `FeedbackDisplayComponent` - Read-only display of existing feedback
- `FeedbackIndicatorComponent` - Small badge/icon showing feedback status
- `FeedbackDashboardComponent` - Analytics dashboard (future)

### 5. Language Model Integration Requirements

#### 5.1 Data Format for ML Training

Feedback data must be exportable in formats suitable for language model training:

1. **JSON Lines Format**
   - One JSON object per line
   - Include session context (prompts, tool usage, responses)
   - Include associated feedback
   - Example structure:
   ```json
   {
     "session_id": "abc-123",
     "prompts": [...],
     "responses": [...],
     "feedback": {...},
     "metadata": {...}
   }
   ```

2. **Training Pairs Format**
   - Input: Session context + prompt
   - Output: Response quality indicators from feedback
   - Format suitable for fine-tuning or RLHF (Reinforcement Learning from Human Feedback)

#### 5.2 Feedback Aggregation

Implement analytics to extract insights:
- Common patterns in low-rated sessions
- Prompt characteristics that correlate with high/low accuracy
- Tool usage patterns that lead to better outcomes
- Task categories with lowest completion rates

#### 5.3 API for ML Model Access

Create specialized endpoints for ML integration:
```
GET /api/ml/training-data
  - Returns formatted data for model training
  - Includes session data with feedback
  - Supports pagination and filtering

GET /api/ml/feedback-insights
  - Returns aggregated statistics
  - Common issues by category
  - Performance metrics over time
```

### 6. Privacy and Security Requirements

#### 6.1 Data Privacy

- Feedback data may contain sensitive information about code and tasks
- **Authentication is required** to ensure data security and proper attribution
  - Implement user authentication for all feedback operations
  - Each feedback entry must be associated with an authenticated user
  - For single-user deployments, a simple authentication mechanism is still required
- Allow users to mark feedback as "private" (not for ML training)
- Provide data export and deletion capabilities (GDPR compliance)

#### 6.2 Data Sanitization

- Sanitize user input to prevent XSS attacks
- Validate all input fields on both client and server
- Ensure feedback cannot contain malicious code or scripts

#### 6.3 Access Control

- Only authenticated users should submit feedback
- Users should only view/edit their own feedback (unless admin)
- Implement role-based access for analytics dashboard

### 7. Non-Functional Requirements

#### 7.1 Performance

**Performance Targets** (measured on localhost or with < 50ms network latency):
- Feedback form should load in < 200ms
- Feedback submission should complete in < 1 second (including validation and persistence)
- Feedback retrieval should be < 500ms for single session
- Support at least 10,000 feedback entries without performance degradation

**Note**: These targets assume development or local network conditions. For production deployments over the internet, adjust expectations based on network latency and test under realistic conditions.

#### 7.2 Usability

- Feedback form should be intuitive and take < 2 minutes to complete
- Provide helpful tooltips and examples
- Use progressive disclosure (hide advanced features by default)
- Mobile-responsive design for all feedback interfaces

#### 7.3 Reliability

- Implement offline support (store feedback locally, sync when online)
- Handle network errors gracefully with retry logic
- Prevent data loss during submission failures
- Implement auto-save for long feedback forms

### 8. Implementation Phases

#### Phase 1: Core Feedback Collection
- Implement basic data model
- Create feedback submission form
- Implement backend API for CRUD operations
- Display feedback indicator on sessions

#### Phase 2: Enhanced Features
- Add per-prompt feedback capability
- Implement feedback editing
- Add filtering and search for feedback
- Create basic analytics views

#### Phase 3: ML Integration
- Implement data export for ML training
- Create aggregation and insights API
- Build feedback dashboard with trends
- Integrate with recommendation system

### 9. Success Metrics

The feedback system should track:
- Feedback submission rate (% of sessions with feedback)
- Average time to submit feedback
- Feedback completeness (% of optional fields filled)
- User satisfaction with feedback process
- Utility of feedback for ML model improvement

### 10. Future Enhancements

- **Automated Feedback Suggestions**: Use AI to suggest feedback based on session patterns
- **Collaborative Feedback**: Allow teams to provide collective feedback on sessions
- **A/B Testing Integration**: Track which AI model versions receive better feedback
- **Real-time Feedback**: Allow users to provide feedback during an active session
- **Feedback Templates**: Pre-defined templates for common task types
- **Comparative Analysis**: Compare feedback across different agent versions or configurations

## Conclusion

This requirements document provides a comprehensive foundation for implementing a user feedback evaluation system. The system should be built incrementally, starting with core functionality and expanding based on user needs and ML integration requirements. All implementation should prioritize data quality, user experience, and actionable insights for continuous improvement of the AI agent system.
