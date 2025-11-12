"use client";

import { Button } from "@/components/ui/button";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  Lock,
} from "lucide-react";

const epitrelloFeatures: BentoItem[] = [
  {
    title: "Visual Boards",
    meta: "Drag & Drop",
    description:
      "Organize tasks and projects in customizable boards with intuitive drag-and-drop workflow management",
    icon: <LayoutDashboard className="w-4 h-4 text-blue-500" />,
    status: "Live",
    tags: ["Boards", "Lists"],
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: "Real-Time Collaboration",
    meta: "Live Updates",
    description: "Work together seamlessly with instant updates, comments, attachments, and @mentions",
    icon: <Users className="w-4 h-4 text-purple-500" />,
    status: "Active",
    tags: ["Team", "Sync"],
    colSpan: 2,
  },
  {
    title: "Smart Automation",
    meta: "Butler AI",
    description: "Automate repetitive tasks with custom rules, buttons, and scheduled commands",
    icon: <TrendingUp className="w-4 h-4 text-cyan-500" />,
    tags: ["Automation", "Rules"],
    cta: "Learn more →",
  },
  {
    title: "Power-Ups & Integrations",
    meta: "200+ Apps",
    description: "Connect with Slack, Google Drive, Jira, and hundreds of your favorite tools",
    icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    status: "Popular",
    tags: ["Integrations", "Sync"],
    cta: "Browse apps →",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to manage work
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features that help teams stay organized and productive
          </p>
        </div>

        <BentoGrid items={epitrelloFeatures} />

        {/* CTA */}
        <div className="text-center mt-16">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/auth/register">Start for Free</Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Free forever plan available
          </p>
        </div>
      </div>
    </section>
  );
}

