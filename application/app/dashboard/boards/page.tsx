"use client";

import { useState, useEffect } from "react";
import { BoardsGrid } from "@/components/boards";
import { LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function BoardsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data || []);
        // Select first organization by default
        if (data && data.length > 0) {
          setSelectedOrg(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Boards
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your projects with Kanban boards
          </p>
        </div>

        {organizations.length > 1 && (
          <div className="w-64">
            <Label className="text-sm mb-2 block">Organization</Label>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
          <p className="text-muted-foreground">
            Create an organization first to start managing boards.
          </p>
        </div>
      ) : (
        <BoardsGrid organizationId={selectedOrg} />
      )}
    </div>
  );
}

