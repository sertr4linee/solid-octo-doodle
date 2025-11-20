"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { BellIcon } from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  avatar: string;
  fallback: string;
  text: string;
  time: string;
};

export function NotificationsPopover({
  notifications,
  notificationCount = 0,
}: {
  notifications: Notification[];
  notificationCount?: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full relative"
          aria-label="Open notifications"
        >
          <BellIcon className="size-5" />
          {notificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-pulse"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" className="w-80 my-6">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notificationCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {notificationCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 && notificationCount === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          notifications.map(({ id, avatar, fallback, text, time }) => (
            <DropdownMenuItem key={id} className="flex items-start gap-3">
              <Avatar className="size-8">
                <AvatarImage src={avatar} alt="Avatar" />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{text}</span>
                <span className="text-xs text-muted-foreground">{time}</span>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-sm text-muted-foreground hover:text-primary cursor-pointer">
          <Link href="/dashboard/notifications">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
