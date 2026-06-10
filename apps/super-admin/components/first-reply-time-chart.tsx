"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts";
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
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

const chartConfig = {
	amount: {
		label: "Revenue",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

export function FirstReplyTimeChart({
	className,
	data,
	...props
}: ComponentProps<typeof Card> & { data?: any }) {
	const chartRows = data?.monthlyRevenue || [];

	const firstAmount = chartRows[0]?.amount ?? 0;
	const lastAmount = chartRows.at(-1)?.amount ?? firstAmount;

	const revenueGrowthPct =
		firstAmount > 0 ? ((lastAmount - firstAmount) / firstAmount) * 100 : 0;

	return (
		<Card
			className={cn("shadow-none md:col-span-2 dark:ring-0", className)}
			{...(props as any)}
		>
			<CardHeader className="space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<CardTitle>Revenue Trend</CardTitle>
					<Delta value={revenueGrowthPct} variant="badge">
						<DeltaIcon variant="trend" />
						<DeltaValue />
					</Delta>
				</div>
				<CardDescription>
					Total revenue over the last 6 months.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer className="aspect-video w-full" config={chartConfig}>
					<LineChart
						accessibilityLayer
						data={chartRows}
						margin={{ top: 24, left: 20, right: 12, bottom: 8 }}
					>
						<CartesianGrid className="stroke-border" vertical={false} />
						<XAxis
							axisLine={false}
							dataKey="month"
							interval={0}
							tickFormatter={(value) => String(value).slice(0, 3)}
							tickLine={false}
							tickMargin={8}
						/>
						<ChartTooltip
							content={<ChartTooltipContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800" indicator="line" />}
							cursor={false}
						/>
						<Line
							activeDot={{ r: 6 }}
							dataKey="amount"
							dot={{ fill: "var(--color-amount)" }}
							stroke="var(--color-amount)"
							strokeWidth={2}
							type="natural"
						>
							<LabelList
								className="fill-foreground"
								dataKey="amount"
								fontSize={12}
								formatter={(label) => {
									const n = Number(label);
									if (n >= 1000) {
										return `${(n / 1000).toFixed(1)}k`;
									}
									return Number.isFinite(n)
										? `${n}`
										: String(label ?? "");
								}}
								offset={12}
								position="top"
							/>
						</Line>
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
