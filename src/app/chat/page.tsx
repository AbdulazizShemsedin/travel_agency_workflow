import { Metadata } from "next";
import { ChatContainer } from "@/components/chat/ChatContainer";

export const metadata: Metadata = {
  title: "Messages & Chat | Travel Agency Workflow",
  description: "Live V2 messaging workspace for agency staff and foreign agency partners.",
};

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <ChatContainer />
    </div>
  );
}
