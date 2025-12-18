"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  Code,
  Link2,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Eye,
  Edit3,
  AtSign,
  ImageIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownRenderer } from "./markdown-renderer";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  users?: User[]; // Users that can be mentioned
  onMention?: (userId: string) => void;
  className?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write a comment... Use @ to mention someone",
  disabled = false,
  users = [],
  onMention,
  className,
  minHeight = "100px",
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = React.useState(false);
  const [showMentions, setShowMentions] = React.useState(false);
  const [mentionSearch, setMentionSearch] = React.useState("");
  const [mentionIndex, setMentionIndex] = React.useState(0);
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Filter users based on mention search
  const filteredUsers = React.useMemo(() => {
    if (!mentionSearch) return users.slice(0, 5);
    return users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(mentionSearch.toLowerCase())
      )
      .slice(0, 5);
  }, [users, mentionSearch]);

  // Handle text changes and detect @mentions
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);
    onChange(newValue);

    // Detect if we're typing a mention
    const textBeforeCursor = newValue.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionSearch(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionSearch("");
    }
  };

  // Insert mention
  const insertMention = (user: User) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newValue = `${beforeMention}@${user.name.replace(/\s+/g, "_")} ${textAfterCursor}`;
      onChange(newValue);
      onMention?.(user.id);
    }

    setShowMentions(false);
    setMentionSearch("");
    textareaRef.current?.focus();
  };

  // Handle keyboard navigation for mentions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredUsers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredUsers[mentionIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    }
  };

  // Insert formatting
  const insertFormat = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const newValue = value.slice(0, start) + prefix + selectedText + suffix + value.slice(end);
    onChange(newValue);

    // Set cursor position after prefix
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, label: "Bold", action: () => insertFormat("**") },
    { icon: Italic, label: "Italic", action: () => insertFormat("*") },
    { icon: Code, label: "Code", action: () => insertFormat("`") },
    { icon: Link2, label: "Link", action: () => insertFormat("[", "](url)") },
    { icon: Heading2, label: "Heading", action: () => insertFormat("\n## ", "\n") },
    { icon: Quote, label: "Quote", action: () => insertFormat("\n> ", "\n") },
    { icon: List, label: "Bullet List", action: () => insertFormat("\n- ", "\n") },
    { icon: ListOrdered, label: "Numbered List", action: () => insertFormat("\n1. ", "\n") },
  ];

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {toolbarButtons.map((btn) => (
          <Button
            key={btn.label}
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={btn.action}
            disabled={disabled || isPreview}
            title={btn.label}
          >
            <btn.icon className="h-4 w-4" />
          </Button>
        ))}

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => insertFormat("```\n", "\n```")}
          disabled={disabled || isPreview}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => insertFormat("@")}
          disabled={disabled || isPreview}
          title="Mention"
        >
          <AtSign className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button
          type="button"
          variant={isPreview ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 gap-1"
          onClick={() => setIsPreview(!isPreview)}
          disabled={disabled}
        >
          {isPreview ? (
            <>
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </>
          )}
        </Button>
      </div>

      {/* Editor/Preview */}
      <div className="relative">
        {isPreview ? (
          <div
            className="p-3 prose prose-sm dark:prose-invert max-w-none"
            style={{ minHeight }}
          >
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="border-0 rounded-none focus-visible:ring-0 resize-none"
              style={{ minHeight }}
            />

            {/* Mentions Popover */}
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute left-2 bottom-2 z-50 bg-popover border rounded-md shadow-lg p-1 min-w-[200px]">
                {filteredUsers.map((user, index) => (
                  <button
                    key={user.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm",
                      index === mentionIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => insertMention(user)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                    <span className="text-muted-foreground text-xs truncate">
                      {user.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
