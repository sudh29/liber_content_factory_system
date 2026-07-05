// hooks/useAgentSession.ts
import { useState, useEffect } from 'react';
import { adkClient } from '../api/adkClient';

export function useAgentSession(sessionId?: string) {
    const [messages, setMessages] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!sessionId) return;
        
        const eventSource = new EventSource(adkClient.getEventStreamUrl(sessionId));
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, data]);
        };

        eventSource.onerror = () => {
            eventSource.close();
            setIsGenerating(false);
        };

        return () => {
            eventSource.close();
        };
    }, [sessionId]);

    const runAgent = async (inputs: any) => {
        setIsGenerating(true);
        try {
            await adkClient.runAgent({ session_id: sessionId, inputs });
        } catch (error) {
            console.error("Agent Run Error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return { messages, isGenerating, runAgent };
}
