"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  Users,
  Mail,
  MoreVertical,
  Trash2,
  Crown,
  Shield,
  User,
  Settings,
  Loader2,
  UserPlus,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  members: Member[];
  invitations: Invitation[];
  currentUserRole: string;
  _count: {
    members: number;
    team: number;
  };
}

export default function OrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  useEffect(() => {
    loadOrganization();
  }, [params.id]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
        setEditName(data.name);
      } else {
        toast.error("Failed to load organization");
        router.push("/dashboard/organizations");
      }
    } catch (error) {
      console.error("Error loading organization:", error);
      toast.error("Failed to load organization");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${params.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (response.ok) {
        toast.success("Invitation sent successfully!");
        setInviteEmail("");
        setInviteRole("member");
        setIsInviteDialogOpen(false);
        loadOrganization();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to send invitation");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/organizations/${params.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        toast.success("Member role updated!");
        loadOrganization();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${params.id}/members?userId=${userId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Member removed successfully");
        setMemberToDelete(null);
        loadOrganization();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${params.id}/invitations?invitationId=${invitationId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Invitation cancelled");
        loadOrganization();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to cancel invitation");
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const handleUpdateOrganization = async () => {
    if (!editName) {
      toast.error("Organization name is required");
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });

      if (response.ok) {
        toast.success("Organization updated!");
        setIsEditDialogOpen(false);
        loadOrganization();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update organization");
      }
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization");
    }
  };

  const handleDeleteOrganization = async () => {
    try {
      const response = await fetch(
        `/api/organizations?organizationId=${params.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Organization deleted");
        router.push("/dashboard/organizations");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete organization");
      }
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error("Failed to delete organization");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-purple-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-green-500" />;
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

  const canManageMembers = organization?.currentUserRole === "owner" || organization?.currentUserRole === "admin";
  const isOwner = organization?.currentUserRole === "owner";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              {organization.name}
            </h1>
            <p className="text-muted-foreground">@{organization.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canManageMembers && (
            <>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Organization Settings</DialogTitle>
                    <DialogDescription>
                      Update organization details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Organization Name</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleUpdateOrganization}>Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join {organization.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger id="invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleInvite}>Send Invitation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization._count.members}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.invitations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            {getRoleIcon(organization.currentUserRole)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{organization.currentUserRole}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">
            Members ({organization.members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({organization.invitations.length})
          </TabsTrigger>
          {isOwner && <TabsTrigger value="danger">Danger Zone</TabsTrigger>}
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.image || ""} />
                          <AvatarFallback>
                            {member.user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(member.role)}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage Member</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {isOwner && member.role !== "owner" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.user.id, "owner")}
                              >
                                <Crown className="h-4 w-4 mr-2" />
                                Make Owner
                              </DropdownMenuItem>
                            )}
                            {(isOwner || member.role === "member") && member.role !== "admin" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.user.id, "admin")}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            {canManageMembers && member.role !== "member" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.user.id, "member")}
                              >
                                <User className="h-4 w-4 mr-2" />
                                Make Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setMemberToDelete(member)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          {organization.invitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending invitations</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organization.invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(invitation.role)}>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      {canManageMembers && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Danger Zone Tab */}
        {isOwner && (
          <TabsContent value="danger" className="space-y-4">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that will permanently affect this organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                  <div>
                    <h3 className="font-semibold">Delete Organization</h3>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this organization and all its data
                    </p>
                  </div>
                  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Organization</DialogTitle>
                        <DialogDescription>
                          Are you absolutely sure? This action cannot be undone. This will
                          permanently delete the organization and remove all members.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsDeleteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteOrganization}>
                          Delete Organization
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Member Dialog */}
      <Dialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToDelete?.user.name} from this
              organization?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (memberToDelete) {
                  handleRemoveMember(memberToDelete.user.id);
                }
              }}
            >
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
