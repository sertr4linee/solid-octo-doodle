"use client";

import Dither from "@/components/dither";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DITHER_PRESETS } from "@/lib/dither-presets";

export function HeroSection() {
  return (
    "use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MoveRight } from "lucide-react";
import { DitherBackground } from "@/components/dither-background";
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
    <section className="relative w-full h-screen overflow-hidden">
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
      <div className="relative z-10 flex h-full w-full items-center justify-center px-6 text-center">
        <div className="container mx-auto flex flex-col items-center gap-12 text-center">
          <Button variant="secondary" size="sm" className="gap-4">
            Powered by Better Auth <MoveRight className="w-4 h-4" />
          </Button>

          <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter font-regular">
            <span className="text-white">Your work, but</span>
            <span className="relative flex w-full justify-center overflow-hidden md:pb-4 md:pt-1">
              &nbsp;
              {projectTitles.map((title, index) => (
                <motion.span
                  key={index}
                  className="absolute font-semibold text-white"
                  initial={{ opacity: 0, y: "-100" }}
                  transition={{ type: "spring", stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? { y: 0, opacity: 1 }
                      : { y: titleNumber > index ? -150 : 150, opacity: 0 }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
            <br />
            <span
              className="font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
              style={{ fontFamily: "'Momo Signature', cursive" }}
            >
              with Epitrello
            </span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed tracking-tight text-white/90 max-w-2xl text-center">
            The visual tool that empowers your team to manage any type of
            project, workflow, or task tracking with ease.
          </p>

          <div className="flex flex-row gap-3 flex-wrap justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="gap-4">
                Get started - it's free <MoveRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth">
              <Button
                size="lg"
                variant="outline"
                className="gap-4 bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
  );
}
