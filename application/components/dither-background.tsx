"use client";

import Dither from "@/components/dither";

interface DitherBackgroundProps {
  waveColor?: [number, number, number];
  colorNum?: number;
  pixelSize?: number;
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
  className?: string;
}

export function DitherBackground({
  waveColor = [0.0, 0.47, 0.75],
  colorNum = 6,
  pixelSize = 3,
  waveSpeed = 0.04,
  waveFrequency = 2.5,
  waveAmplitude = 0.25,
  enableMouseInteraction = true,
  mouseRadius = 0.3,
  className = ""
}: DitherBackgroundProps) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Dither
        waveColor={waveColor}
        disableAnimation={false}
        enableMouseInteraction={enableMouseInteraction}
        mouseRadius={mouseRadius}
        colorNum={colorNum}
        waveAmplitude={waveAmplitude}
        waveFrequency={waveFrequency}
        waveSpeed={waveSpeed}
        pixelSize={pixelSize}
      />
    </div>
  );
}
