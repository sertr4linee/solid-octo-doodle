"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

export function useNotificationCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const previousCountRef = useRef(0);

  const fetchCount = async () => {
    try {
      const response = await fetch("/api/auth/organization/list-invitations");
      if (response.ok) {
        const data = await response.json();
        const pendingInvitations = data.filter(
          (inv: any) =>
            inv.status === "pending" && new Date(inv.expiresAt) > new Date()
        );
        const newCount = pendingInvitations.length;
        
        // Si le nombre a augmenté, afficher une notification
        if (!loading && newCount > previousCountRef.current) {
          const newInvitationsCount = newCount - previousCountRef.current;
          toast.success(
            `🎉 You have ${newInvitationsCount} new invitation${newInvitationsCount > 1 ? 's' : ''}!`,
            {
              description: "Check your notifications to view and accept them.",
              duration: 5000,
            }
          );
        }
        
        previousCountRef.current = newCount;
        setCount(newCount);
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
