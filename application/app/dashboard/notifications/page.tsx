"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Check, X, Users, Clock, Mail } from "lucide-react";

interface Invitation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviterEmail: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

export default function NotificationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/organization/list-invitations");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data || []);
      }
    } catch (error) {
      console.error("Failed to load invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (error) {
        toast.error("Failed to accept invitation");
        return;
      }

      toast.success("Invitation accepted! 🎉");
      loadInvitations(); // Refresh the list
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await authClient.organization.rejectInvitation({
        invitationId,
      });

      if (error) {
        toast.error("Failed to reject invitation");
        return;
      }

      toast.success("Invitation rejected");
      loadInvitations(); // Refresh the list
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      toast.error("Failed to reject invitation");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await authClient.organization.cancelInvitation({
        invitationId,
      });

      if (error) {
        toast.error("Failed to cancel invitation");
        return;
      }

      toast.success("Invitation cancelled");
      loadInvitations(); // Refresh the list
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const pendingInvitations = invitations.filter(inv => inv.status === "pending");
  const acceptedInvitations = invitations.filter(inv => inv.status === "accepted");
  const rejectedInvitations = invitations.filter(inv => inv.status === "rejected");
  const expiredInvitations = invitations.filter(inv => {
    const now = new Date();
    return inv.status === "pending" && new Date(inv.expiresAt) < now;
  });

  const isExpired = (expiresAt: Date) => {
    return new Date(expiresAt) < new Date();
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff < 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return "Expires soon";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "admin":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "member":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const InvitationCard = ({ invitation }: { invitation: Invitation }) => {
    const expired = isExpired(invitation.expiresAt);

    return (
      <Card className="hover:border-blue-500/50 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Building2 className="size-6 text-blue-500" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{invitation.organizationName}</h3>
                  <Badge className={getRoleBadgeColor(invitation.role)}>
                    {invitation.role}
                  </Badge>
                  {expired && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="size-4" />
                    <span>From: {invitation.inviterEmail}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="size-4" />
                    <span>{getTimeRemaining(invitation.expiresAt)}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  You've been invited to join <span className="font-medium text-foreground">{invitation.organizationName}</span> as a {invitation.role}.
                </p>
              </div>
            </div>
            {invitation.status === "pending" && !expired && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAcceptInvitation(invitation.id)}
                  size="sm"
                  className="gap-2"
                >
                  <Check className="size-4" />
                  Accept
                </Button>
                <Button
                  onClick={() => handleRejectInvitation(invitation.id)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <X className="size-4" />
                  Decline
                </Button>
              </div>
            )}
            {invitation.status === "pending" && expired && (
              <Button
                onClick={() => handleCancelInvitation(invitation.id)}
                size="sm"
                variant="ghost"
              >
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            Notifications
            {pendingInvitations.length > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingInvitations.length} new
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Manage your invitations and notifications
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2 relative">
            Pending
            {pendingInvitations.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-2">
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            Accepted
            {acceptedInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-2">
                {acceptedInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            Declined
            {rejectedInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-2">
                {rejectedInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expired" className="gap-2">
            Expired
            {expiredInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-2">
                {expiredInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Loading invitations...</p>
              </CardContent>
            </Card>
          ) : pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-2">
                <Mail className="size-12 mx-auto text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">No pending invitations</h3>
                <p className="text-muted-foreground">
                  You're all caught up! New invitations will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingInvitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4 mt-6">
          {acceptedInvitations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-2">
                <Check className="size-12 mx-auto text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">No accepted invitations</h3>
                <p className="text-muted-foreground">
                  Invitations you accept will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            acceptedInvitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-6">
          {rejectedInvitations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-2">
                <X className="size-12 mx-auto text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">No declined invitations</h3>
                <p className="text-muted-foreground">
                  Invitations you decline will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            rejectedInvitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4 mt-6">
          {expiredInvitations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-2">
                <Clock className="size-12 mx-auto text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">No expired invitations</h3>
                <p className="text-muted-foreground">
                  Expired invitations will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            expiredInvitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
