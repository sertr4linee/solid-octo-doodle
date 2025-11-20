"use client";

import { useEffect, useState } from "react";

export function useNotificationCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    try {
      const response = await fetch("/api/auth/organization/list-invitations");
      if (response.ok) {
        const data = await response.json();
        const pendingInvitations = data.filter(
          (inv: any) =>
            inv.status === "pending" && new Date(inv.expiresAt) > new Date()
        );
        setCount(pendingInvitations.length);
      }
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { count, loading, refetch: fetchCount };
}
