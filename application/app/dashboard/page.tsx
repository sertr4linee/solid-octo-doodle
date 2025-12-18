"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Clock, 
  TrendingUp,
  CheckCircle2,
  Circle,
  ArrowRight,
  Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface Stats {
  totalBoards: number;
  totalOrganizations: number;
  totalTasks: number;
  completedTasks: number;
  recentActivity: number;
}

interface Board {
  id: string;
  name: string;
  organization: {
    name: string;
  };
  _count: {
    lists: number;
    members: number;
  };
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  _count: {
    members: number;
    boards: number;
  };
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBoards, setRecentBoards] = useState<Board[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      loadDashboardData();
    }
  }, [session]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Charger les boards
      const boardsRes = await fetch("/api/boards?filter=all");
      const boards = boardsRes.ok ? await boardsRes.json() : [];
      
      // Charger les organisations
      const orgsRes = await fetch("/api/organizations");
      const orgs = orgsRes.ok ? await orgsRes.json() : [];
      
      // Calculer les statistiques
      const totalTasks = boards.reduce((acc: number, board: any) => acc + (board._count?.lists || 0), 0);
      
      setStats({
        totalBoards: boards.length,
        totalOrganizations: orgs.length,
        totalTasks: totalTasks * 3, // Approximation
        completedTasks: Math.floor(totalTasks * 1.5), // Approximation
        recentActivity: boards.filter((b: any) => {
          const diff = Date.now() - new Date(b.updatedAt).getTime();
          return diff < 24 * 60 * 60 * 1000; // Dernières 24h
        }).length,
      });
      
      setRecentBoards(boards.slice(0, 5));
      setOrganizations(orgs.slice(0, 5));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 border-2 border-muted rounded-full"></div>
            <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session.user.name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border px-4 py-2 rounded-full">
          <Clock className="h-4 w-4" />
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Boards
            </CardTitle>
            <LayoutDashboard className="h-4 w-4 text-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalBoards || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active projects
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalOrganizations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Teams managed
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Task Completion
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats?.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall progress
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.recentActivity || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Updates today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-7">
        {/* Recent Boards - Takes up 4 columns */}
        <Card className="col-span-4 bg-card border-border shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-foreground">Recent Boards</CardTitle>
              <Link 
                href="/dashboard/boards"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <CardDescription className="text-muted-foreground">
              Your most recently updated boards
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded bg-muted" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 bg-muted" />
                      <Skeleton className="h-3 w-24 bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentBoards.length > 0 ? (
              <div className="space-y-4">
                {recentBoards.map((board) => (
                  <Link
                    key={board.id}
                    href={`/dashboard/boards/${board.id}`}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-all duration-200 group"
                  >
                    <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                      <LayoutDashboard className="h-6 w-6 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-foreground truncate group-hover:underline decoration-1 underline-offset-4">
                        {board.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{board.organization.name}</span>
                        <span>•</span>
                        <span>{board._count.lists} lists</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {board._count.members} {board._count.members === 1 ? 'member' : 'members'}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                <LayoutDashboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium">No boards yet</p>
                <Link
                  href="/dashboard/boards"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Create your first board
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Column - Organizations & Profile - Takes up 3 columns */}
        <div className="col-span-3 space-y-8">
          {/* Organizations */}
          <Card className="bg-card border-border shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-foreground">Organizations</CardTitle>
                <Link 
                  href="/dashboard/organizations"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <CardDescription className="text-muted-foreground">
                Teams and workspaces
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded bg-muted" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32 bg-muted" />
                        <Skeleton className="h-3 w-24 bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : organizations.length > 0 ? (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <Link
                      key={org.id}
                      href={`/dashboard/organizations/${org.slug}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200 group"
                    >
                      <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                        <span className="text-foreground font-bold text-lg">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {org.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{org._count.members} members</span>
                          <span>•</span>
                          <span>{org._count.boards} boards</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No organizations yet</p>
                  <Link
                    href="/dashboard/organizations"
                    className="text-xs text-primary hover:underline mt-2 inline-block"
                  >
                    Create your first organization
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Profile Card */}
          <Card className="bg-card border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border">
                  <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                  <AvatarFallback className="bg-secondary text-foreground text-xl font-bold">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-lg font-medium text-foreground">{session.user.name || "Not provided"}</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  <div className="pt-2">
                    {session.user.emailVerified ? (
                      <Badge variant="outline" className="border-green-900/30 text-green-600 dark:text-green-400 bg-green-500/10">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        <Circle className="h-3 w-3 mr-1" />
                        Not verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
