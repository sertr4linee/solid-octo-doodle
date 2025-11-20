"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Users, Mail, Trash2, Loader2, ArrowRight, Crown, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/use-socket";

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // Socket.IO connection
  const { isConnected, on, off } = useSocket({ enabled: true });

  useEffect(() => {
    loadOrganizations();
  }, []);

  // Écouter les événements Socket.IO
  useEffect(() => {
    if (!isConnected) return;

    const handleOrgCreated = (data: any) => {
      console.log("🆕 New organization created:", data);
      toast.success("A new organization has been created!");
      loadOrganizations();
    };

    const handleOrgUpdated = (data: any) => {
      console.log("✏️ Organization updated:", data);
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === data.data.id ? { ...org, ...data.data } : org
        )
      );
    };

    const handleOrgDeleted = (data: any) => {
      console.log("🗑️ Organization deleted:", data);
      toast.info("An organization has been deleted");
      setOrganizations((prev) => prev.filter((org) => org.id !== data.data.id));
    };

    on("organization:created", handleOrgCreated);
    on("organization:updated", handleOrgUpdated);
    on("organization:deleted", handleOrgDeleted);

    return () => {
      off("organization:created", handleOrgCreated);
      off("organization:updated", handleOrgUpdated);
      off("organization:deleted", handleOrgDeleted);
    };
  }, [isConnected, on, off]);

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      // Utiliser le nouvel endpoint API
      const response = await fetch("/api/organizations");
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Organizations loaded:", data);
        setOrganizations(data || []);
      } else {
        console.error("Failed to load organizations");
        toast.error("Failed to load organizations");
        setOrganizations([]);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast.error("Failed to load organizations");
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName || !newOrgSlug) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrgName,
          slug: newOrgSlug,
        }),
      });

      if (response.ok) {
        toast.success("Organization created successfully! 🎉");
        setNewOrgName("");
        setNewOrgSlug("");
        setIsCreateDialogOpen(false);
        loadOrganizations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create organization");
      }
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(error.message || "Failed to create organization");
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !selectedOrgId) {
      toast.error("Please provide an email address");
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${selectedOrgId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: "member",
        }),
      });

      if (response.ok) {
        toast.success("Invitation sent successfully! 📧");
        setInviteEmail("");
        setIsInviteDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send invitation");
      }
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast.error(error.message || "Failed to send invitation");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3.5 w-3.5" />;
      case "admin":
        return <Shield className="h-3.5 w-3.5" />;
      default:
        return <UserIcon className="h-3.5 w-3.5" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "admin":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-green-500/10 text-green-500 border-green-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organizations and team members
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Create a new organization to collaborate with your team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  placeholder="Acme Inc."
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value);
                    // Auto-generate slug
                    setNewOrgSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "")
                    );
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="acme-inc"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateOrg}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org: any) => (
          <Card 
            key={org.id}
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {org.name}
                </div>
                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>@{org.slug}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{org.memberCount || 0} members</span>
              </div>
              <Badge className={getRoleBadgeColor(org.role)}>
                <span className="flex items-center gap-1.5">
                  {getRoleIcon(org.role)}
                  Your role: {org.role}
                </span>
              </Badge>
            </CardContent>
            <CardFooter className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Dialog 
                open={isInviteDialogOpen && selectedOrgId === org.id} 
                onOpenChange={(open) => {
                  setIsInviteDialogOpen(open);
                  if (!open) setSelectedOrgId(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrgId(org.id);
                      setIsInviteDialogOpen(true);
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Invite Member to {org.name}</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join this organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleInviteMember}>Send Invitation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No organizations yet</p>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Create your first organization to start collaborating with your team
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
