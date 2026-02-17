/**
 * TypeScript definitions for Session Feedback
 */

export interface PromptFeedback {
  promptIndex: number;
  promptText: string;
  responseAccuracy: number; // 1-5
  responseHelpful: boolean;
  issues?: string[];
  notes?: string;
}

export interface SessionFeedback {
  id: string; // Server-generated
  sessionId: string;
  timestamp: Date;
  
  // Overall session evaluation
  overallAccuracy: number; // 1-5
  overallSatisfaction: number; // 1-5
  
  // Task completion assessment
  taskCompleted: boolean;
  taskCompletionNotes?: string;
  
  // Quality metrics
  codeQuality?: number; // 1-5
  responseRelevance?: number; // 1-5
  efficiency?: number; // 1-5
  
  // Qualitative feedback
  whatWorkedWell?: string;
  whatNeedsImprovement?: string;
  additionalComments?: string;
  
  // Context metadata
  userRole?: string;
  taskCategory?: string;
  complexity?: 'low' | 'medium' | 'high';
  
  // Prompt-specific feedback
  promptFeedback?: PromptFeedback[];
}

// Separate type for creating new feedback (without server-generated fields)
export interface CreateSessionFeedback extends Omit<SessionFeedback, 'id' | 'timestamp'> {
  // Client provides all fields except id and timestamp which are server-generated
}

export interface FeedbackFilters {
  minAccuracy?: number;
  maxAccuracy?: number;
  taskCompleted?: boolean;
  taskCategory?: string;
  startDate?: string;
  endDate?: string;
}

export const TASK_CATEGORIES = [
  'bug-fix',
  'feature-development',
  'documentation',
  'refactoring',
  'testing',
  'debugging',
  'code-review',
  'other'
] as const;

export const ISSUE_TYPES = [
  'hallucination',
  'incomplete',
  'incorrect',
  'off-topic',
  'outdated',
  'security-concern'
] as const;
