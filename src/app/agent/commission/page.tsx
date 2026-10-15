"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function AgentCommissionPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/agent");
  }, [router]);

  return null;
}
