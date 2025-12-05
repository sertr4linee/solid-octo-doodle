"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";

interface SearchFilters {
  labels: string[];
  members: string[];
  dateFrom: string;
  dateTo: string;
  status: string[];
  archived: boolean;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableLabels?: string[];
  availableMembers?: Array<{ id: string; name: string }>;
  availableStatuses?: Array<{ id: string; name: string }>;
}

export function SearchFilters({
  filters,
  onFiltersChange,
  availableLabels = [],
  availableMembers = [],
  availableStatuses = [],
}: SearchFiltersProps) {
  const [open, setOpen] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleArrayFilter = (
    key: "labels" | "members" | "status",
    value: string
  ) => {
    const current = filters[key];
    if (current.includes(value)) {
      updateFilter(
        key,
        current.filter((v) => v !== value)
      );
    } else {
      updateFilter(key, [...current, value]);
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({
      labels: [],
      members: [],
      dateFrom: "",
      dateTo: "",
      status: [],
      archived: false,
    });
  };

  const activeFilterCount =
    filters.labels.length +
    filters.members.length +
    filters.status.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.archived ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtres
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtres de recherche</SheetTitle>
          <SheetDescription>
            Affinez votre recherche avec des filtres avancés
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Labels */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Labels</Label>
              {filters.labels.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilter("labels", [])}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {availableLabels.map((label) => (
                <div key={label} className="flex items-center space-x-2">
                  <Checkbox
                    id={`label-${label}`}
                    checked={filters.labels.includes(label)}
                    onCheckedChange={() => toggleArrayFilter("labels", label)}
                  />
                  <label
                    htmlFor={`label-${label}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {label}
                  </label>
                </div>
              ))}
              {availableLabels.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun label disponible
                </p>
              )}
            </div>
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Membres</Label>
              {filters.members.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilter("members", [])}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {availableMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={filters.members.includes(member.id)}
                    onCheckedChange={() =>
                      toggleArrayFilter("members", member.id)
                    }
                  />
                  <label
                    htmlFor={`member-${member.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {member.name}
                  </label>
                </div>
              ))}
              {availableMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun membre disponible
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Status / Listes</Label>
              {filters.status.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilter("status", [])}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {availableStatuses.map((status) => (
                <div key={status.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.id}`}
                    checked={filters.status.includes(status.id)}
                    onCheckedChange={() =>
                      toggleArrayFilter("status", status.id)
                    }
                  />
                  <label
                    htmlFor={`status-${status.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {status.name}
                  </label>
                </div>
              ))}
              {availableStatuses.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun status disponible
                </p>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <Label className="mb-3 block">Date d'échéance</Label>
            <div className="space-y-3">
              <div>
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                  De
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                  À
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Archived */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="archived"
              checked={filters.archived}
              onCheckedChange={(checked) =>
                updateFilter("archived", checked === true)
              }
            />
            <label
              htmlFor="archived"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Inclure les éléments archivés
            </label>
          </div>

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={clearAllFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Effacer tous les filtres
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
