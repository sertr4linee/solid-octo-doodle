"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

// Types
export type KanbanColumn = {
  id: string;
  name: string;
  color?: string;
};

export type KanbanItem = {
  id: string;
  column: string;
  [key: string]: unknown;
};

type KanbanContextValue<T extends KanbanItem = KanbanItem> = {
  columns: KanbanColumn[];
  data: T[];
  activeId: string | null;
  activeItem: T | null;
  onDataChange?: (data: T[]) => void;
};

const KanbanContext = React.createContext<KanbanContextValue<KanbanItem> | null>(null);

function useKanbanContext<T extends KanbanItem = KanbanItem>() {
  const context = React.useContext(KanbanContext);
  if (!context) {
    throw new Error("Kanban components must be used within KanbanProvider");
  }
  return context as unknown as KanbanContextValue<T>;
}

// Provider
type KanbanProviderProps<T extends KanbanItem> = {
  children: React.ReactNode;
  columns: KanbanColumn[];
  data: T[];
  onDataChange?: (data: T[]) => void;
};

export function KanbanProvider<T extends KanbanItem>({
  children,
  columns,
  data,
  onDataChange,
}: KanbanProviderProps<T>) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<T[]>(data);

  React.useEffect(() => {
    setItems(data);
  }, [data]);

  const activeItem = React.useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [items, activeId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = items.find((item) => item.id === activeId);
    if (!activeItem) return;

    // Check if we're over a column
    const isOverColumn = columns.some((col) => col.id === overId);
    if (isOverColumn && activeItem.column !== overId) {
      setItems((prev) => {
        const newItems = prev.map((item) =>
          item.id === activeId ? { ...item, column: overId } : item
        );
        return newItems as T[];
      });
      return;
    }

    // Check if we're over another item
    const overItem = items.find((item) => item.id === overId);
    if (overItem && activeItem.column !== overItem.column) {
      setItems((prev) => {
        const newItems = prev.map((item) =>
          item.id === activeId ? { ...item, column: overItem.column } : item
        );
        return newItems as T[];
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) {
      onDataChange?.(items);
      return;
    }

    const activeItem = items.find((item) => item.id === activeId);
    const overItem = items.find((item) => item.id === overId);

    if (!activeItem) return;

    // If dropping on same column, reorder items
    if (overItem && activeItem.column === overItem.column) {
      const columnItems = items.filter((item) => item.column === activeItem.column);
      const activeIndex = columnItems.findIndex((item) => item.id === activeId);
      const overIndex = columnItems.findIndex((item) => item.id === overId);

      if (activeIndex !== overIndex) {
        const newColumnItems = arrayMove(columnItems, activeIndex, overIndex);
        const otherItems = items.filter((item) => item.column !== activeItem.column);
        const newItems = [...otherItems, ...newColumnItems] as T[];
        setItems(newItems);
        onDataChange?.(newItems);
        return;
      }
    }

    onDataChange?.(items);
  };

  const contextValue: KanbanContextValue<KanbanItem> = {
    columns,
    data: items,
    activeId,
    activeItem,
    onDataChange: onDataChange as ((data: KanbanItem[]) => void) | undefined,
  };

  return (
    <KanbanContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DndContext>
    </KanbanContext.Provider>
  );
}

// Board
interface KanbanBoardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function KanbanBoard({ id, children, className }: KanbanBoardProps) {
  const { data } = useKanbanContext();
  const columnItems = data.filter((item) => item.column === id);
  const itemIds = columnItems.map((item) => item.id);

  return (
    <div
      className={cn(
        "flex flex-col shrink-0 w-72 bg-muted/50 rounded-xl p-3",
        className
      )}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

// Header
interface KanbanHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function KanbanHeader({ children, className }: KanbanHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between mb-3 pb-2 border-b",
        className
      )}
    >
      {children}
    </div>
  );
}

// Cards Container
interface KanbanCardsProps<T extends KanbanItem> {
  id: string;
  children: (item: T) => React.ReactNode;
  className?: string;
}

export function KanbanCards<T extends KanbanItem>({
  id,
  children,
  className,
}: KanbanCardsProps<T>) {
  const { data } = useKanbanContext<T>();
  const columnItems = data.filter((item) => item.column === id);

  return (
    <div className={cn("flex-1 overflow-y-auto space-y-2.5 min-h-[100px]", className)}>
      {columnItems.map((item) => children(item))}
    </div>
  );
}

// Card
interface KanbanCardProps {
  id: string;
  name: string;
  column: string;
  children?: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export function KanbanCard({
  id,
  name,
  column,
  children,
  className,
  asChild,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardContent = children || (
    <p className="text-sm font-medium">{name}</p>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-background rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-primary/50 transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        className
      )}
    >
      {cardContent}
    </div>
  );
}

// Drag Overlay for smooth animations
interface KanbanDragOverlayProps {
  children?: (item: KanbanItem) => React.ReactNode;
}

export function KanbanDragOverlay({ children }: KanbanDragOverlayProps) {
  const { activeItem } = useKanbanContext();

  return (
    <DragOverlay>
      {activeItem ? (
        children ? (
          children(activeItem)
        ) : (
          <div className="bg-background rounded-lg p-3 shadow-lg border-2 border-primary">
            <p className="text-sm font-medium">{(activeItem as { name?: string }).name || activeItem.id}</p>
          </div>
        )
      ) : null}
    </DragOverlay>
  );
}

// Column Title component
interface KanbanColumnTitleProps {
  children: React.ReactNode;
  count?: number;
  className?: string;
}

export function KanbanColumnTitle({
  children,
  count,
  className,
}: KanbanColumnTitleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <h3 className="font-semibold text-sm uppercase tracking-wide text-foreground">
        {children}
      </h3>
      {count !== undefined && (
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

// Add Card Button
interface KanbanAddCardProps {
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function KanbanAddCard({
  onClick,
  children,
  className,
}: KanbanAddCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full mt-2 p-2 text-sm text-muted-foreground hover:text-foreground",
        "hover:bg-muted rounded-lg transition-colors",
        "flex items-center justify-center gap-1",
        className
      )}
    >
      {children || (
        <>
          <span className="text-lg leading-none">+</span>
          Add a card
        </>
      )}
    </button>
  );
}

export { useKanbanContext };
