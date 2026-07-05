// components/Chat/ChatWindow.tsx
import React, { useState } from 'react';
import { useAgentSession } from '../../hooks/useAgentSession';
import MessageBubble from './MessageBubble';

export default function ChatWindow({ sessionId }: { sessionId?: string }) {
    const { messages, isGenerating, runAgent } = useAgentSession(sessionId);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;
        runAgent({ prompt: input });
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-lg p-4">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}
                {isGenerating && <div className="text-gray-400 text-sm">Agent is thinking...</div>}
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-slate-800 rounded px-3 py-2 text-white"
                    placeholder="Ask the agent team..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
