// api/adkClient.ts
// Wraps ADK endpoints for running agents and managing sessions

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface RunAgentRequest {
    session_id?: string;
    agent_id?: string;
    inputs: Record<string, any>;
}

export const adkClient = {
    async runAgent(request: RunAgentRequest) {
        const response = await fetch(`${BASE_URL}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        return response.json();
    },

    getEventStreamUrl(sessionId: string) {
        return `${BASE_URL}/run_sse?session_id=${sessionId}`;
    }
};
