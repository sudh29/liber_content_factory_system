// components/Chat/MessageBubble.tsx
import React from 'react';
import AgentBadge from './AgentBadge';
import { AdkEvent } from '../../types/adk';

export default function MessageBubble({ message }: { message: AdkEvent }) {
    const isUser = message.author === 'user';
    
    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            {!isUser && <AgentBadge agentName={message.author} />}
            <div className={`mt-1 p-3 rounded-lg max-w-[80%] ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-200'}`}>
                {message.content}
            </div>
        </div>
    );
}
