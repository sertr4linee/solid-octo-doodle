"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  BACKGROUND_COLORS,
  GRADIENTS,
  type BackgroundOption,
  type UnsplashPhoto,
} from "@/lib/types/customization";

interface BackgroundPickerProps {
  currentBackground?: BackgroundOption;
  onSelect: (background: BackgroundOption) => void;
}

export function BackgroundPicker({
  currentBackground,
  onSelect,
}: BackgroundPickerProps) {
  const [selectedTab, setSelectedTab] = useState("colors");
  const [blur, setBlur] = useState(currentBackground?.blur || false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unsplashPhotos, setUnsplashPhotos] = useState<UnsplashPhoto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const searchUnsplash = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/unsplash/search?query=${encodeURIComponent(searchQuery)}&per_page=12`
      );

      if (!response.ok) throw new Error("Failed to search");

      const data = await response.json();
      setUnsplashPhotos(data.results || []);
    } catch (error) {
      console.error("Error searching Unsplash:", error);
      toast.error("Failed to search photos");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUnsplashSelect = async (photo: UnsplashPhoto) => {
    try {
      // Trigger download endpoint as per Unsplash API guidelines
      await fetch("/api/unsplash/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          downloadLocation: photo.links.download_location,
        }),
      });

      onSelect({
        type: "unsplash",
        value: photo.urls.regular,
        preview: photo.urls.thumb,
        blur,
      });
    } catch (error) {
      console.error("Error selecting photo:", error);
      toast.error("Failed to select photo");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "background");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload");

      const data = await response.json();
      onSelect({
        type: "image",
        value: data.url,
        blur,
      });

      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    // Load popular backgrounds by default
    if (selectedTab === "unsplash" && unsplashPhotos.length === 0) {
      setSearchQuery("workspace");
      searchUnsplash();
    }
  }, [selectedTab]);

  return (
    <div className="space-y-4">
      {/* Blur toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="blur-toggle">Blur background</Label>
        <Switch
          id="blur-toggle"
          checked={blur}
          onCheckedChange={setBlur}
        />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="gradients">Gradients</TabsTrigger>
          <TabsTrigger value="unsplash">Photos</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {BACKGROUND_COLORS.map((color) => (
              <button
                key={color.value}
                className="h-16 rounded-lg border-2 hover:scale-105 transition-transform"
                style={{ backgroundColor: color.value }}
                onClick={() =>
                  onSelect({ type: "color", value: color.value, blur })
                }
                title={color.name}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gradients" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {GRADIENTS.map((gradient) => (
              <button
                key={gradient.name}
                className="h-24 rounded-lg border-2 hover:scale-105 transition-transform relative overflow-hidden"
                style={{ background: gradient.value }}
                onClick={() =>
                  onSelect({ type: "gradient", value: gradient.value, blur })
                }
              >
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                  {gradient.name}
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="unsplash" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUnsplash()}
            />
            <Button
              onClick={searchUnsplash}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {unsplashPhotos.map((photo) => (
              <button
                key={photo.id}
                className="relative h-32 rounded-lg overflow-hidden hover:scale-105 transition-transform border-2"
                onClick={() => handleUnsplashSelect(photo)}
              >
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description || "Background"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                  by {photo.user.name}
                </div>
              </button>
            ))}
          </div>

          {unsplashPhotos.length === 0 && !isSearching && (
            <p className="text-center text-gray-500 py-8">
              Search for photos to use as backgrounds
            </p>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
                  <p className="text-sm text-gray-600">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Upload custom image</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5MB, JPG/PNG/GIF
                    </p>
                  </div>
                </>
              )}
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
