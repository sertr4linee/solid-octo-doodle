"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LiquidButton } from "@/components/ui/button";
import { MoveRight, Sparkles } from "lucide-react";
import { DitherBackground } from "@/components/backgrounds/dither-background";
import { DITHER_COLORS } from "@/lib/dither-presets";
import Link from "next/link";

export function HeroSection() {
  const [titleNumber, setTitleNumber] = useState(0);

  const projectTitles = [
    "organized",
    "productive",
    "collaborative",
    "efficient",
    "seamless",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleNumber((prev) => (prev + 1) % projectTitles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="hero" className="relative w-full h-screen overflow-hidden">
      <DitherBackground
        waveColor={DITHER_COLORS.trelloBlue}
        colorNum={6}
        pixelSize={3}
        waveSpeed={0.03}
        waveFrequency={2}
        waveAmplitude={0.2}
        enableMouseInteraction={true}
        mouseRadius={0.4}
      />
      {/* Gradient de transition vers le noir */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-black/50 to-black z-[5] pointer-events-none" />
      <div className="relative z-10 flex h-full w-full items-center justify-center px-6 text-center">
        <div className="container mx-auto flex flex-col items-center gap-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white">
            <Sparkles className="w-3 h-3" />
            Powered by moi meme
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl md:text-6xl max-w-3xl tracking-tighter font-regular">
              <span className="text-white block mb-2">Your work, but</span>
              <span className="relative flex w-full justify-center overflow-visible" style={{ height: "1.2em", minHeight: "90px" }}>
                {projectTitles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
                    style={{ 
                      fontFamily: "'Momo Signature', cursive",
                      top: "50%",
                      transform: "translateY(-50%)",
                      WebkitTextStroke: "0.5px transparent",
                      textRendering: "geometricPrecision"
                    }}
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? { y: "-50%", opacity: 1 }
                        : { y: titleNumber > index ? "-200%" : "100%", opacity: 0 }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>
          </div>

          <p className="text-base md:text-lg leading-relaxed tracking-tight text-white/80 max-w-xl mt-2">
            The visual tool that empowers your team to manage any type of
            project, workflow, or task tracking with ease.
          </p>

          <div className="flex flex-row gap-3 flex-wrap justify-center mt-4">
            <Link href="/auth/register">
              <LiquidButton size="lg" className="gap-2 text-white">
                Get started
              </LiquidButton>
            </Link>
            <Link href="/auth">
              <LiquidButton
                size="lg"
                variant="outline"
                className="gap-2 bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                Sign in
              </LiquidButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
