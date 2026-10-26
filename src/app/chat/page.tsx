"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { useAuth } from "@/components/providers/AuthProvider";

export default function ChatPage() {
  const router = useRouter();
  const { authUser, roles, isLoading } = useAuth();

  const isPureForeignAgency = React.useMemo(() => {
    const hasRole = roles.some((r) => String(r).toLowerCase().trim() === "foreign agency");
    return hasRole && authUser?.is_internal_staff === false;
  }, [roles, authUser]);

  React.useEffect(() => {
    if (!isLoading && isPureForeignAgency) {
      router.replace("/agent/chat");
    }
  }, [isLoading, isPureForeignAgency, router]);

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col max-w-full overflow-hidden">
      <ChatContainer />
    </div>
  );
}
