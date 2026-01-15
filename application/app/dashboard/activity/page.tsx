"use client";

import { ActivityFeed } from "@/components/activity";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity as ActivityIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ActivityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <ActivityIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Activity Feed
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Track all actions across your boards
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 m-4 overflow-hidden">
          <ActivityFeed
            showFilters={true}
            maxHeight="calc(100vh - 200px)"
          />
        </div>
      </div>
    </div>
  );
}
