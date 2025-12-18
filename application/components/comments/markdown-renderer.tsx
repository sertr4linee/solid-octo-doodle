"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

// Import highlight.js styles
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Custom component to render @mentions
function MentionLink({ username }: { username: string }) {
  return (
    <span className="inline-flex items-center px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-sm">
      @{username}
    </span>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Pre-process content to handle @mentions
  const processedContent = React.useMemo(() => {
    // Convert @username to a special marker that we can style
    return content.replace(
      /@([a-zA-Z0-9_]+)/g,
      '<span class="mention" data-mention="$1">@$1</span>'
    );
  }, [content]);

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // Custom styles for code blocks
        "[&_pre]:bg-zinc-900 [&_pre]:text-zinc-100 [&_pre]:rounded-lg [&_pre]:p-4",
        "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        // Mention styles
        "[&_.mention]:inline-flex [&_.mention]:items-center [&_.mention]:px-1 [&_.mention]:py-0.5",
        "[&_.mention]:rounded [&_.mention]:bg-blue-100 [&_.mention]:dark:bg-blue-900/30",
        "[&_.mention]:text-blue-700 [&_.mention]:dark:text-blue-300 [&_.mention]:font-medium",
        // Task list styles
        "[&_input[type=checkbox]]:mr-2",
        // Table styles
        "[&_table]:border-collapse [&_table]:w-full",
        "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted",
        "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom link handling
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          ),
          // Custom code block
          pre: ({ children, ...props }) => (
            <pre className="relative group" {...props}>
              {children}
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                onClick={() => {
                  const code = (children as any)?.props?.children;
                  if (typeof code === "string") {
                    navigator.clipboard.writeText(code);
                  }
                }}
              >
                Copy
              </button>
            </pre>
          ),
          // Custom image
          img: ({ src, alt, ...props }) => (
            <img
              src={src}
              alt={alt || ""}
              className="max-w-full h-auto rounded-lg"
              loading="lazy"
              {...props}
            />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
