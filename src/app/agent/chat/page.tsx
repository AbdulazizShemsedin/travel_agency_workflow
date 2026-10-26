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
      <div className="w-full h-full min-h-0 flex-1 flex flex-col">
        <ChatContainer />
      </div>
    </AgentLayout>
  );
}
