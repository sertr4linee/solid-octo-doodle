"use client"

import React, { useEffect, useRef } from "react"

interface GradientMeshProps {
  colors?: string[]
  distortion?: number
  swirl?: number
  speed?: number
  rotation?: number
  waveAmp?: number
  waveFreq?: number
  waveSpeed?: number
  grain?: number
}

export function GradientMesh({
  colors = ["#bcecf6", "#00aaff", "#ffd447"],
  distortion = 8,
  swirl = 0.2,
  speed = 1,
  rotation = 90,
  waveAmp = 0.2,
  waveFreq = 20,
  waveSpeed = 0.2,
  grain = 0.06,
}: GradientMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const animate = () => {
      if (!ctx) return

      time += 0.01 * speed

      const w = canvas.width
      const h = canvas.height

      // Clear canvas
      ctx.fillStyle = colors[0]
      ctx.fillRect(0, 0, w, h)

      // Create gradient mesh effect
      const gradient = ctx.createLinearGradient(0, 0, w, h)
      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color)
      })

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      // Add noise/grain
      if (grain > 0) {
        const imageData = ctx.getImageData(0, 0, w, h)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * grain * 255
          data[i] += noise
          data[i + 1] += noise
          data[i + 2] += noise
        }
        ctx.putImageData(imageData, 0, 0)
      }

      animationId = requestAnimationFrame(animate)
    }

    resize()
    animate()

    window.addEventListener("resize", resize)

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [colors, distortion, swirl, speed, rotation, waveAmp, waveFreq, waveSpeed, grain])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ width: "100%", height: "100%" }}
    />
  )
}
