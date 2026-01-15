"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link2,
  Plus,
  X,
  Search,
  Loader2,
  ExternalLink,
  CornerDownRight,
  CornerUpLeft,
  Copy,
  Ban,
  Octagon,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import Link from "next/link";

interface LinkedTask {
  id: string;
  title: string;
  emoji?: string | null;
  listName: string;
  boardId: string;
  boardName: string;
}

interface CardLink {
  id: string;
  direction: "outgoing" | "incoming";
  linkType: string;
  linkedTask: LinkedTask;
  createdBy: {
    id: string;
    name: string;
    image?: string | null;
  };
  createdAt: string;
}

interface LinkType {
  label: string;
  icon: string;
  inverse: string;
}

interface RelatedCardsProps {
  taskId: string;
  boardId: string;
  onLinkCountChange?: (count: number) => void;
}

const LINK_TYPE_ICONS: Record<string, React.ReactNode> = {
  related_to: <Link2 className="h-3.5 w-3.5" />,
  follow_up_of: <CornerDownRight className="h-3.5 w-3.5" />,
  has_follow_up: <CornerUpLeft className="h-3.5 w-3.5" />,
  duplicate: <Copy className="h-3.5 w-3.5" />,
  has_duplicate: <Copy className="h-3.5 w-3.5" />,
  blocks: <Ban className="h-3.5 w-3.5" />,
  blocked_by: <Octagon className="h-3.5 w-3.5" />,
};

const LINK_TYPE_COLORS: Record<string, string> = {
  related_to: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  follow_up_of: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  has_follow_up: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  duplicate: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  has_duplicate: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  blocks: "bg-red-500/10 text-red-600 dark:text-red-400",
  blocked_by: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function RelatedCards({ taskId, boardId, onLinkCountChange }: RelatedCardsProps) {
  const [links, setLinks] = useState<CardLink[]>([]);
  const [linkTypes, setLinkTypes] = useState<Record<string, LinkType>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LinkedTask[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState("related_to");

  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing links
  const fetchLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/links`);
      if (!response.ok) throw new Error("Failed to fetch links");

      const data = await response.json();
      setLinks(data.links);
      setLinkTypes(data.linkTypes);
      onLinkCountChange?.(data.links.length);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, onLinkCountChange]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Search for tasks
  useEffect(() => {
    const searchTasks = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/tasks/search?q=${encodeURIComponent(debouncedSearch)}&excludeTaskId=${taskId}&limit=8`
        );
        if (!response.ok) throw new Error("Failed to search");

        const data = await response.json();
        setSearchResults(data.tasks);
      } catch (error) {
        console.error("Error searching tasks:", error);
      } finally {
        setIsSearching(false);
      }
    };

    searchTasks();
  }, [debouncedSearch, taskId]);

  // Create a new link
  const handleCreateLink = async (targetTaskId: string) => {
    try {
      setIsAddingLink(true);
      const response = await fetch(`/api/tasks/${taskId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTaskId,
          linkType: selectedLinkType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create link");
      }

      const newLink = await response.json();
      setLinks((prev) => [newLink, ...prev]);
      onLinkCountChange?.(links.length + 1);
      toast.success("Link created successfully");

      // Reset state
      setSearchQuery("");
      setSearchResults([]);
      setAddPopoverOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create link");
    } finally {
      setIsAddingLink(false);
    }
  };

  // Delete a link
  const handleDeleteLink = async (linkId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/links?linkId=${linkId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete link");

      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      onLinkCountChange?.(links.length - 1);
      toast.success("Link removed");
    } catch (error) {
      toast.error("Failed to remove link");
    }
  };

  // Group links by type
  const groupedLinks = links.reduce((acc, link) => {
    const type = link.linkType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(link);
    return acc;
  }, {} as Record<string, CardLink[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Related Cards {links.length > 0 && `(${links.length})`}
          </span>
        </div>

        <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Plus className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Link</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="end"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              searchInputRef.current?.focus();
            }}
          >
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Link Type</span>
              </div>
              <Select value={selectedLinkType} onValueChange={setSelectedLinkType}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="related_to">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5" />
                      <span>Related to</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="follow_up_of">
                    <div className="flex items-center gap-2">
                      <CornerDownRight className="h-3.5 w-3.5" />
                      <span>Follow-up of</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="duplicate">
                    <div className="flex items-center gap-2">
                      <Copy className="h-3.5 w-3.5" />
                      <span>Duplicate of</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="blocks">
                    <div className="flex items-center gap-2">
                      <Ban className="h-3.5 w-3.5" />
                      <span>Blocks</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="blocked_by">
                    <div className="flex items-center gap-2">
                      <Octagon className="h-3.5 w-3.5" />
                      <span>Blocked by</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search for a task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-1">
                  {searchResults.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleCreateLink(task.id)}
                      disabled={isAddingLink}
                      className={cn(
                        "w-full p-2 rounded-md text-left transition-colors",
                        "hover:bg-accent",
                        isAddingLink && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {task.emoji && (
                          <span className="text-base flex-shrink-0">{task.emoji}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {task.boardName} → {task.listName}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No tasks found
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Type to search for tasks
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Links list */}
      {links.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Link2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No linked cards yet</p>
          <p className="text-xs mt-1">Link related tasks to see connections</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedLinks).map(([linkType, typeLinks]) => (
            <div key={linkType} className="space-y-2">
              {/* Link type header */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                  LINK_TYPE_COLORS[linkType] || "bg-gray-500/10 text-gray-600"
                )}>
                  {LINK_TYPE_ICONS[linkType] || <Link2 className="h-3.5 w-3.5" />}
                  <span>{linkTypes[linkType]?.label || linkType.replace(/_/g, " ")}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ({typeLinks.length})
                </span>
              </div>

              {/* Links in this type */}
              <div className="space-y-1 pl-1">
                {typeLinks.map((link) => (
                  <div
                    key={link.id}
                    className="group flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

                    {link.linkedTask.emoji && (
                      <span className="text-sm flex-shrink-0">{link.linkedTask.emoji}</span>
                    )}

                    <Link
                      href={`/dashboard/boards/${link.linkedTask.boardId}?task=${link.linkedTask.id}`}
                      className="flex-1 min-w-0 hover:underline"
                    >
                      <p className="text-sm font-medium truncate">
                        {link.linkedTask.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.linkedTask.boardId !== boardId && (
                          <span>{link.linkedTask.boardName} → </span>
                        )}
                        {link.linkedTask.listName}
                      </p>
                    </Link>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/dashboard/boards/${link.linkedTask.boardId}?task=${link.linkedTask.id}`}
                        className="p-1 rounded hover:bg-accent"
                        title="Open task"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                        title="Remove link"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
