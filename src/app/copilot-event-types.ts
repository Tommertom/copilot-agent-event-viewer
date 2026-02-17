/**
 * TypeScript definitions for GitHub Copilot Agent Events
 * Auto-generated from agent-log JSON files
 */

/**
 * Common context information present in all events
 */
export interface EventContext {
  cwd: string;
  workspaceRoot: string;
  pid: number;
  platform: string;
  nodeVersion: string;
}

/**
 * Base interface for all Copilot events
 */
export interface BaseEvent {
  hookName: string;
  timestamp: number;
  isoTimestamp: string;
  context: EventContext;
}

/**
 * Session Start Event - Triggered when a new Copilot session begins
 */
export interface SessionStartEvent extends BaseEvent {
  hookName: 'sessionStart';
  input: {
    timestamp: string;
    hookEventName: 'SessionStart';
    sessionId: string;
    transcript_path: string;
    source: string;
    cwd: string;
  };
}

/**
 * User Prompt Submitted Event - Triggered when user submits a prompt
 */
export interface UserPromptSubmittedEvent extends BaseEvent {
  hookName: 'userPromptSubmitted';
  input: {
    timestamp: string;
    hookEventName: 'UserPromptSubmit';
    sessionId: string;
    transcript_path: string;
    prompt: string;
    cwd: string;
  };
}

/**
 * Tool input can vary by tool type. Common structure for run_in_terminal.
 */
export interface ToolInput {
  command?: string;
  goal?: string;
  explanation?: string;
  isBackground?: boolean;
  timeout?: number;
  [key: string]: any; // Allow for other tool-specific properties
}

/**
 * Pre-Tool Use Event - Triggered before a tool is invoked
 */
export interface PreToolUseEvent extends BaseEvent {
  hookName: 'preToolUse';
  input: {
    timestamp: string;
    hookEventName: 'PreToolUse';
    sessionId: string;
    transcript_path: string;
    tool_name: string;
    tool_input: ToolInput;
    tool_use_id: string;
    cwd: string;
  };
}

/**
 * Post-Tool Use Event - Triggered after a tool has been invoked
 */
export interface PostToolUseEvent extends BaseEvent {
  hookName: 'postToolUse';
  input: {
    timestamp: string;
    hookEventName: 'PostToolUse';
    sessionId: string;
    transcript_path: string;
    tool_name: string;
    tool_input: ToolInput;
    tool_response: string;
    tool_use_id: string;
    cwd: string;
  };
}

/**
 * Union type representing any Copilot event
 */
export type CopilotEvent =
  | SessionStartEvent
  | UserPromptSubmittedEvent
  | PreToolUseEvent
  | PostToolUseEvent;

/**
 * Type guard to check if an event is a SessionStartEvent
 */
export function isSessionStartEvent(event: CopilotEvent): event is SessionStartEvent {
  return event.hookName === 'sessionStart';
}

/**
 * Type guard to check if an event is a UserPromptSubmittedEvent
 */
export function isUserPromptSubmittedEvent(event: CopilotEvent): event is UserPromptSubmittedEvent {
  return event.hookName === 'userPromptSubmitted';
}

/**
 * Type guard to check if an event is a PreToolUseEvent
 */
export function isPreToolUseEvent(event: CopilotEvent): event is PreToolUseEvent {
  return event.hookName === 'preToolUse';
}

/**
 * Type guard to check if an event is a PostToolUseEvent
 */
export function isPostToolUseEvent(event: CopilotEvent): event is PostToolUseEvent {
  return event.hookName === 'postToolUse';
}

/**
 * Event type names as a const array for iteration
 */
export const EVENT_TYPES = [
  'sessionStart',
  'userPromptSubmitted',
  'preToolUse',
  'postToolUse',
] as const;

/**
 * Event type literal type
 */
export type EventType = typeof EVENT_TYPES[number];
