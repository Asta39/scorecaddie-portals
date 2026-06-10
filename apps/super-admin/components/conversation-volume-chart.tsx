"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
	amount: {
		label: "Revenue",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig;

export function ConversationVolumeChart({
	className,
	data,
	...props
}: ComponentProps<typeof Card> & { data?: any }) {
	const chartUid = useId().replace(/:/g, "");
	const idAreaGradient = `conversation-volume-area-grad-${chartUid}`;

	const chartRows = data?.monthlyRevenue || [];

	return (
		<Card
			className={cn(
				"shadow-none md:col-span-2 lg:col-span-3 dark:ring-0",
				className
			)}
			{...(props as any)}
		>
			<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<CardTitle>Revenue Overview</CardTitle>
					</div>
					<CardDescription>
						Platform-wide payment volume (last 6 months)
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent>
				<ChartContainer className="aspect-22/8 w-full" config={chartConfig}>
					<AreaChart
						accessibilityLayer
						data={chartRows}
						margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
					>
						<defs>
							<linearGradient id={idAreaGradient} x1="0" x2="0" y1="0" y2="1">
								<stop
									offset="0%"
									stopColor="var(--color-amount)"
									stopOpacity={0.45}
								/>
								<stop
									offset="55%"
									stopColor="var(--color-amount)"
									stopOpacity={0.12}
								/>
								<stop
									offset="100%"
									stopColor="var(--color-amount)"
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid className="stroke-border" vertical={false} />
						<XAxis
							axisLine={false}
							dataKey="month"
							tickLine={false}
							tickMargin={8}
						/>
						<YAxis
							axisLine={false}
							tick={{ className: "tabular-nums" }}
							tickLine={false}
							tickMargin={8}
							width={36}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									className="min-w-34 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
									indicator="line"
								/>
							}
							cursor={false}
						/>
						<Area
							dataKey="amount"
							dot={false}
							fill={`url(#${idAreaGradient})`}
							stroke="var(--color-amount)"
							strokeWidth={2}
							type="natural"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
