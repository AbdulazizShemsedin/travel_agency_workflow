"use client";

import * as React from "react";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { ChatContainer } from "@/components/chat/ChatContainer";

export default function AgentChatPage() {
  const [activeContractor, setActiveContractor] = React.useState<string>("");

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="max-w-7xl mx-auto space-y-4">
        <ChatContainer />
      </div>
    </AgentLayout>
  );
}
