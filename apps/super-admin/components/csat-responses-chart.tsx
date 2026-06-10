"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Bar, BarChart, Rectangle, XAxis, YAxis } from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
	caddies: {
		label: "Total Caddies",
		color: "var(--chart-1)",
	},
	active: {
		label: "Active Subscriptions",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

/** Half of bar width (8) so ends read as fully rounded “caps”. */
const BAR_RADIUS = 4;

function ColumnHoverCursor(props: React.ComponentProps<typeof Rectangle>) {
	return (
		<Rectangle
			fill="var(--muted)"
			fillOpacity={0.5}
			radius={BAR_RADIUS * 2}
			stroke="none"
			{...(props as any)}
		/>
	);
}

export function CsatResponsesChart({
	className,
	data,
	...props
}: ComponentProps<typeof Card> & { data?: any }) {
	const chartRows = data?.clubCaddies || [];

	return (
		<Card
			className={cn("shadow-none md:col-span-2 dark:ring-0", className)}
			{...(props as any)}
		>
			<CardHeader>
				<CardTitle>Top Clubs by Caddies</CardTitle>
				<CardDescription>
					Distribution of caddies (total vs active subscriptions) per club.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer className="aspect-video w-full" config={chartConfig}>
					<BarChart accessibilityLayer data={chartRows}>
						<XAxis
							axisLine={false}
							dataKey="name"
							interval={0}
							tickLine={false}
							tickMargin={10}
							fontSize={12}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							tickMargin={10}
						/>
						<ChartTooltip
							content={<ChartTooltipContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800" />}
							cursor={<ColumnHoverCursor />}
						/>
						<Bar
							dataKey="caddies"
							fill="var(--color-caddies)"
							radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
						/>
						<Bar
							dataKey="active"
							fill="var(--color-active)"
							radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
