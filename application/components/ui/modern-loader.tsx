import { cn } from "@/lib/utils";

interface ModernLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function ModernLoader({ size = "md", className, text }: ModernLoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className="relative">
        <div className={cn("border-2 border-white/10 rounded-full", sizeClasses[size])}></div>
        <div
          className={cn(
            "absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin",
            sizeClasses[size]
          )}
        ></div>
      </div>
      {text && <p className="text-sm text-gray-400 animate-pulse">{text}</p>}
    </div>
  );
}

export function FullPageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <ModernLoader size="lg" text={text} />
    </div>
  );
}

export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <ModernLoader size="md" text={text} />
    </div>
  );
}
