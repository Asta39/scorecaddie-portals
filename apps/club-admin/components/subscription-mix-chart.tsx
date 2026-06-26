"use client";

import React from "react";
import { LabelList, Pie, PieChart, Cell } from "recharts";
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
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
} from "@/components/ui/chart";

export type SubscriptionMixDatum = {
	category: string;
	count: number;
};

const SLICE_PALETTE = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
] as const;

type SliceRow = {
	key: string;
	category: string;
	count: number;
	fill: string;
};

function buildSlices(data: readonly SubscriptionMixDatum[]): {
	chartConfig: ChartConfig;
	pieData: SliceRow[];
} {
	const chartConfig: ChartConfig = {
		count: {
			label: "Count",
		},
	};

	const pieData: SliceRow[] = data.map((row, i) => {
		const key = `s${i}`;
		const color = SLICE_PALETTE[i % SLICE_PALETTE.length];
		chartConfig[key] = {
			label: row.category,
			color,
		};
		return {
			key,
			category: row.category,
			count: row.count,
			fill: `var(--color-${key})`,
		};
	});

	return { chartConfig, pieData };
}

export function SubscriptionMixChart({ data }: { data: SubscriptionMixDatum[] }) {
	const { chartConfig, pieData } = React.useMemo(
		() => buildSlices(data),
		[data]
	);

	const total = pieData.reduce((acc, d) => acc + d.count, 0);

	return (
		<Card className="shadow-none">
			<CardHeader>
				<CardTitle>Subscription Status</CardTitle>
				<CardDescription>Current caddies</CardDescription>
			</CardHeader>
			<CardContent className="my-auto p-0">
				<ChartContainer
					className="aspect-auto h-72 w-full"
					config={chartConfig}
				>
					<PieChart accessibilityLayer>
						<Pie
							cornerRadius={4}
							data={pieData}
							dataKey="count"
							innerRadius={50}
							nameKey="key"
							outerRadius="88%"
							stroke="var(--card)"
							strokeWidth={4}
						>
							<LabelList
								className="fill-background font-medium"
								dataKey="count"
								fill="currentColor"
								fontWeight={500}
								formatter={(label: any) => {
									const n = Number(label);
									if (!Number.isFinite(n) || n === 0) return "";
									return `${n} (${Math.round((n / total) * 100)}%)`;
								}}
								position="inside"
								stroke="none"
							/>
						</Pie>
                        <ChartTooltip
							contentStyle={{
								background: 'hsl(var(--card))',
								borderColor: 'hsl(var(--border))',
								borderRadius: '8px',
								fontSize: '12px',
								color: 'hsl(var(--foreground))',
							}}
						/>
						<ChartLegend
							content={
								<ChartLegendContent
									className="flex flex-wrap gap-3 pt-2"
									nameKey="key"
								/>
							}
						/>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
