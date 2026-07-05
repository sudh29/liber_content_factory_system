// components/Chat/AgentBadge.tsx
import React from 'react';

export default function AgentBadge({ agentName }: { agentName: string }) {
    return (
        <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
            {agentName}
        </span>
    );
}
