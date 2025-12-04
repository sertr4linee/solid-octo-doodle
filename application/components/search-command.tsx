"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Search,
  Calendar,
  Users,
  Tag,
  Clock,
  Star,
  Trash2,
  FileText,
  CheckSquare,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface SearchResult {
  boards: any[];
  tasks: any[];
  comments: any[];
  totalResults: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: string;
  isPinned: boolean;
  usageCount: number;
}

interface SearchHistory {
  id: string;
  query: string;
  filters: string;
  resultCount: number;
  createdAt: string;
}

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filters, setFilters] = useState({
    labels: [] as string[],
    members: [] as string[],
    dateFrom: "",
    dateTo: "",
    status: [] as string[],
    archived: false,
  });

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Load saved searches and history when opening
  useEffect(() => {
    if (open) {
      loadSavedSearches();
      loadHistory();
    }
  }, [open]);

  const loadSavedSearches = async () => {
    try {
      const res = await fetch("/api/search/saved");
      if (res.ok) {
        const data = await res.json();
        setSavedSearches(data);
      }
    } catch (error) {
      console.error("Failed to load saved searches:", error);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/search/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          filters,
          scope: "all",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleNavigate = (type: "board" | "task", id: string, boardId?: string) => {
    if (type === "board") {
      router.push(`/dashboard/boards/${id}`);
    } else if (type === "task" && boardId) {
      router.push(`/dashboard/boards/${boardId}?task=${id}`);
    }
    setOpen(false);
  };

  const saveSearch = async () => {
    if (!query.trim()) return;

    const name = prompt("Nom de la recherche sauvegardée:");
    if (!name) return;

    try {
      const res = await fetch("/api/search/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          query,
          filters,
        }),
      });

      if (res.ok) {
        await loadSavedSearches();
      }
    } catch (error) {
      console.error("Failed to save search:", error);
    }
  };

  const loadSavedSearch = async (search: SavedSearch) => {
    setQuery(search.query);
    if (search.filters) {
      try {
        const parsedFilters = JSON.parse(search.filters);
        setFilters(parsedFilters);
      } catch (error) {
        console.error("Failed to parse filters:", error);
      }
    }
    setShowSaved(false);
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      const res = await fetch(`/api/search/saved/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadSavedSearches();
      }
    } catch (error) {
      console.error("Failed to delete search:", error);
    }
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    try {
      const res = await fetch(`/api/search/saved/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !isPinned }),
      });

      if (res.ok) {
        await loadSavedSearches();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const clearHistory = async () => {
    try {
      const res = await fetch("/api/search/history", {
        method: "DELETE",
      });

      if (res.ok) {
        setHistory([]);
      }
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Rechercher...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <span>Recherche globale</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaved(!showSaved)}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Sauvegardées
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Historique
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher des boards, tasks, comments..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-4"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={saveSearch}
                disabled={!query.trim()}
              >
                <Star className="h-3 w-3 mr-1" />
                Sauvegarder
              </Button>
            </div>
          </div>

          {/* Results / Saved / History */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* Saved Searches */}
            {showSaved && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Recherches sauvegardées</h3>
                </div>
                {savedSearches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune recherche sauvegardée
                  </p>
                ) : (
                  savedSearches.map((search) => (
                    <div
                      key={search.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => loadSavedSearch(search)}
                    >
                      <div className="flex items-center gap-2">
                        {search.isPinned && (
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        )}
                        <span className="font-medium">{search.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {search.query}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {search.usageCount} utilisations
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(search.id, search.isPinned);
                          }}
                        >
                          <Star
                            className={`h-3 w-3 ${
                              search.isPinned ? "fill-yellow-500 text-yellow-500" : ""
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedSearch(search.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Search History */}
            {showHistory && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Historique</h3>
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Effacer
                  </Button>
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun historique
                  </p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => setQuery(item.query)}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{item.query}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.resultCount} résultats
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Search Results */}
            {!showSaved && !showHistory && results && (
              <div className="space-y-4">
                {/* Boards */}
                {results.boards.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">
                        Boards ({results.boards.length})
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {results.boards.map((board) => (
                        <div
                          key={board.id}
                          className="p-3 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() => handleNavigate("board", board.id)}
                        >
                          <div className="font-medium">{board.name}</div>
                          {board.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {board.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {results.tasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">
                        Tasks ({results.tasks.length})
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {results.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() =>
                            handleNavigate("task", task.id, task.list.boardId)
                          }
                        >
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {task.list.name}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {results.comments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">
                        Comments ({results.comments.length})
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {results.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-3 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() =>
                            handleNavigate(
                              "task",
                              comment.task.id,
                              comment.task.list.boardId
                            )
                          }
                        >
                          <div className="text-sm line-clamp-2">
                            {comment.content}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              dans {comment.task.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {results.totalResults === 0 && (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Aucun résultat pour "{query}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!showSaved && !showHistory && !results && !query && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Commencez à taper pour rechercher
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Recherche dans les boards, tasks et comments
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
