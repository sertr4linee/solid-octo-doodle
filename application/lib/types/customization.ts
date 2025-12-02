// Customization Types

export interface BackgroundOption {
  type: "color" | "gradient" | "image" | "unsplash";
  value: string;
  preview?: string;
  blur?: boolean;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  background: BackgroundOption;
  listColor?: string;
  darkMode: boolean;
  preview: string;
}

export interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    html: string;
    download_location: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  description?: string;
  alt_description?: string;
}

// Predefined gradients
export const GRADIENTS = [
  {
    name: "Ocean Blue",
    value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    preview: "bg-linear-135 from-blue-500 to-purple-600",
  },
  {
    name: "Sunset",
    value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    preview: "bg-linear-135 from-pink-400 to-red-500",
  },
  {
    name: "Forest",
    value: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)",
    preview: "bg-linear-135 from-green-600 to-green-400",
  },
  {
    name: "Lavender",
    value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    preview: "bg-linear-135 from-cyan-300 to-pink-300",
  },
  {
    name: "Fire",
    value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    preview: "bg-linear-135 from-pink-500 to-yellow-400",
  },
  {
    name: "Northern Lights",
    value: "linear-gradient(135deg, #00d2ff 0%, #3a47d5 100%)",
    preview: "bg-linear-135 from-cyan-400 to-blue-600",
  },
  {
    name: "Peach",
    value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    preview: "bg-linear-135 from-orange-200 to-orange-400",
  },
  {
    name: "Purple Haze",
    value: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    preview: "bg-linear-135 from-purple-400 to-pink-300",
  },
];

// Predefined colors
export const BACKGROUND_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Gray", value: "#6b7280" },
  { name: "Slate", value: "#475569" },
];

// Theme presets
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "ocean",
    name: "Ocean",
    description: "Calm and professional blue theme",
    background: {
      type: "gradient",
      value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      blur: false,
    },
    darkMode: false,
    preview: "bg-linear-135 from-blue-500 to-purple-600",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm and energetic",
    background: {
      type: "gradient",
      value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      blur: false,
    },
    darkMode: false,
    preview: "bg-linear-135 from-pink-400 to-red-500",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Natural and fresh",
    background: {
      type: "gradient",
      value: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)",
      blur: false,
    },
    darkMode: false,
    preview: "bg-linear-135 from-green-600 to-green-400",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark and elegant",
    background: {
      type: "gradient",
      value: "linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)",
      blur: false,
    },
    darkMode: true,
    preview: "bg-linear-135 from-blue-900 to-slate-900",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and simple",
    background: {
      type: "color",
      value: "#f8fafc",
      blur: false,
    },
    darkMode: false,
    preview: "bg-slate-50",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Bold and colorful",
    background: {
      type: "gradient",
      value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      blur: false,
    },
    darkMode: false,
    preview: "bg-linear-135 from-pink-500 to-yellow-400",
  },
];

// List colors
export const LIST_COLORS = [
  { name: "Default", value: null },
  { name: "Blue", value: "#dbeafe" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Pink", value: "#fce7f3" },
  { name: "Red", value: "#fee2e2" },
  { name: "Orange", value: "#ffedd5" },
  { name: "Yellow", value: "#fef3c7" },
  { name: "Green", value: "#dcfce7" },
  { name: "Teal", value: "#ccfbf1" },
  { name: "Cyan", value: "#cffafe" },
];
