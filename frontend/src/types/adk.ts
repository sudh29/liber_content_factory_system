// types/adk.ts
// Type definitions mirroring ADK event/session JSON

export interface AdkEvent {
    id: string;
    author: string;
    content: string;
    timestamp: number;
    actions?: {
        stateDelta?: Record<string, any>;
    };
}

export interface AdkSession {
    id: string;
    state: Record<string, any>;
    events: AdkEvent[];
}
