"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  Home,
  LayoutDashboard,
  ListTodo,
  Settings,
  Users,
  Archive,
  Building2,
  Bell,
  Store,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import type { Route } from "./layout/nav-main";
import DashboardNavigation from "@/components/layout/nav-main";
import { NotificationsPopover } from "@/components/layout/nav-notifications";
import { TeamSwitcher } from "@/components/layout/team-switcher";
import { useNotificationCount } from "@/hooks/use-notification-count";
import { Badge } from "@/components/ui/badge";

const sampleNotifications = [
  {
    id: "1",
    avatar: "/avatars/01.png",
    fallback: "OM",
    text: "New order received.",
    time: "10m ago",
  },
  {
    id: "2",
    avatar: "/avatars/02.png",
    fallback: "JL",
    text: "Server upgrade completed.",
    time: "1h ago",
  },
  {
    id: "3",
    avatar: "/avatars/03.png",
    fallback: "HH",
    text: "New user signed up.",
    time: "2h ago",
  },
];

const dashboardRoutes: Route[] = [
  {
    id: "home",
    title: "Home",
    icon: <Home className="size-4" />,
    link: "/dashboard",
  },
  {
    id: "boards",
    title: "Boards",
    icon: <LayoutDashboard className="size-4" />,
    link: "/dashboard/boards",
    subs: [
      {
        title: "My Boards",
        link: "/dashboard/boards?filter=my",
        icon: <LayoutDashboard className="size-4" />,
      },
      {
        title: "Shared with me",
        link: "/dashboard/boards?filter=shared",
        icon: <Users className="size-4" />,
      },
      {
        title: "Archived",
        link: "/dashboard/boards?filter=archived",
        icon: <Archive className="size-4" />,
      },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace",
    icon: <Store className="size-4" />,
    link: "/dashboard/marketplace",
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: <ListTodo className="size-4" />,
    link: "/dashboard/tasks",
    subs: [
      {
        title: "All Tasks",
        link: "/dashboard/tasks",
        icon: <ListTodo className="size-4" />,
      },
      {
        title: "Assigned to me",
        link: "/dashboard/tasks/assigned",
        icon: <Users className="size-4" />,
      },
      {
        title: "Activity",
        link: "/dashboard/tasks/activity",
        icon: <Activity className="size-4" />,
      },
    ],
  },
  {
    id: "organizations",
    title: "Organizations",
    icon: <Building2 className="size-4" />,
    link: "/dashboard/organizations",
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: <Bell className="size-4" />,
    link: "/dashboard/notifications",
    badge: "notification-count",
  },
  {
    id: "settings",
    title: "Settings",
    icon: <Settings className="size-4" />,
    link: "/dashboard/settings",
    subs: [
      { title: "General", link: "/dashboard/settings/general" },
      { title: "Profile", link: "/dashboard/settings/profile" },
      { title: "Notifications", link: "/dashboard/settings/notifications" },
      { title: "Security", link: "/dashboard/settings/security" },
    ],
  },
];

const teams = [
  { id: "1", name: "Personal Workspace", logo: Logo, plan: "Free" },
  { id: "2", name: "Team Alpha", logo: Logo, plan: "Pro" },
  { id: "3", name: "Project Beta", logo: Logo, plan: "Free" },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { count } = useNotificationCount();

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between"
        )}
      >
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          {!isCollapsed && (
            <span className="font-semibold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Epitrello
            </span>
          )}
        </a>

        <motion.div
          key={isCollapsed ? "header-collapsed" : "header-expanded"}
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-row md:flex-col-reverse" : "flex-row"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <NotificationsPopover 
            notifications={sampleNotifications} 
            notificationCount={count}
          />
          <SidebarTrigger />
        </motion.div>
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={dashboardRoutes} notificationCount={count} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <TeamSwitcher teams={teams} />
      </SidebarFooter>
    </Sidebar>
  );
}
