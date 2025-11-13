"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { GridPattern } from '@/components/ui/grid-pattern';

type Testimonial = {
	name: string;
	role: string;
	image: string;
	company: string;
	quote: string;
};

const testimonials: Testimonial[] = [
	{
		quote:
			'Epitrello made project management so much easier. The visual boards and drag-and-drop interface are incredibly intuitive.',
		name: 'Sarah Mitchell',
		role: 'Product Manager',
		company: 'TechFlow Inc',
		image: 'https://randomuser.me/api/portraits/women/22.jpg',
	},
	{
		quote:
			'The real-time collaboration features transformed how our remote team works together. Everyone stays in sync effortlessly.',
		name: 'James Chen',
		role: 'Engineering Lead',
		company: 'DevStack',
		image: 'https://randomuser.me/api/portraits/men/23.jpg',
	},
	{
		quote:
			'Butler automation saved us countless hours. We automated our entire sprint workflow and never looked back.',
		name: 'Maria Garcia',
		role: 'Scrum Master',
		company: 'Agile Solutions',
		image: 'https://randomuser.me/api/portraits/women/24.jpg',
	},
	{
		quote:
			'The power-ups and integrations are game-changing. Everything we use connects seamlessly with Epitrello.',
		name: 'Alex Thompson',
		role: 'Operations Director',
		company: 'CloudSync',
		image: 'https://randomuser.me/api/portraits/men/25.jpg',
	},
	{
		quote:
			'Our team productivity increased by 40% after switching to Epitrello. The visibility into tasks is unmatched.',
		name: 'Emily Rodriguez',
		role: 'Project Lead',
		company: 'InnovateCo',
		image: 'https://randomuser.me/api/portraits/women/26.jpg',
	},
	{
		quote:
			'Simple yet powerful. Epitrello adapts to any workflow without overwhelming users with complexity.',
		name: 'David Park',
		role: 'Startup Founder',
		company: 'LaunchPad',
		image: 'https://randomuser.me/api/portraits/men/27.jpg',
	},
];

export function TestimonialsSection() {
	return (
		<section id="testimonials" className="relative w-full pt-24 pb-20 px-4 bg-black">
			{/* Gradient supérieur pour transition douce */}
			<div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
			
			<div aria-hidden className="absolute inset-0 isolate z-0 contain-strict">
				<div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 left-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full" />
				<div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 left-0 h-320 w-60 [translate:5%_-50%] -rotate-45 rounded-full" />
				<div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 left-0 h-320 w-60 -translate-y-87.5 -rotate-45 rounded-full" />
			</div>
			<div className="mx-auto max-w-5xl space-y-8">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold tracking-wide text-balance md:text-4xl lg:text-5xl xl:text-6xl xl:font-extrabold">
						Loved by teams worldwide
					</h1>
					<p className="text-white/70 text-sm md:text-base lg:text-lg">
						See how businesses are thriving with our ERP — real stories, real
						impact, real growth.
					</p>
				</div>
				<div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{testimonials.map(({ name, role, company, quote, image }, index) => (
						<motion.div
							initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
							whileInView={{
								filter: 'blur(0px)',
								translateY: 0,
								opacity: 1,
							}}
							viewport={{ once: true }}
							transition={{ delay: 0.1 * index + 0.1, duration: 0.8 }}
							key={index}
							className="border-white/20 bg-white/5 backdrop-blur-sm relative grid grid-cols-[auto_1fr] gap-x-3 overflow-hidden border border-dashed p-4"
						>
							<div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
								<div className="from-foreground/5 to-foreground/2 absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
									<GridPattern
										width={25}
										height={25}
										x={-12}
										y={4}
										strokeDasharray="3"
										className="stroke-foreground/20 absolute inset-0 h-full w-full mix-blend-overlay"
									/>
								</div>
							</div>
							<img
								alt={name}
								src={image}
								loading="lazy"
								className="size-9 rounded-full"
							/>
							<div>
								<div className="-mt-0.5 -space-y-0.5">
									<p className="text-sm md:text-base">{name}</p>
									<span className="text-white/70 block text-[11px] font-light tracking-tight">
										{role} at {company}
									</span>
								</div>
								<blockquote className="mt-3">
									<p className="text-white/80 text-sm font-light tracking-wide">
										{quote}
									</p>
								</blockquote>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
