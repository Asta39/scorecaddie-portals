"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { LabelList, Pie, PieChart } from "recharts";
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
} from "@/components/ui/chart";

const chartConfig = {
	count: {
		label: "Users",
	},
	clubs: {
		label: "Clubs",
		color: "var(--chart-1)",
	},
	caddies: {
		label: "Caddies",
		color: "var(--chart-3)",
	},
	golfers: {
		label: "Golfers",
		color: "var(--chart-5)",
	},
} satisfies ChartConfig;

export function ChannelBreakdownChart({
	className,
	data,
	...props
}: ComponentProps<typeof Card> & { data?: any }) {
	const totalUsers = (data?.totalClubs || 0) + (data?.totalCaddies || 0) + (data?.totalGolfers || 0);

	const chartData = [
		{ role: "clubs", count: data?.totalClubs || 0, fill: "var(--color-clubs)" },
		{ role: "caddies", count: data?.totalCaddies || 0, fill: "var(--color-caddies)" },
		{ role: "golfers", count: data?.totalGolfers || 0, fill: "var(--color-golfers)" },
	];

	return (
		<Card
			className={cn("flex flex-col shadow-none dark:ring-0", className)}
			{...(props as any)}
		>
			<CardHeader className="items-center space-y-1 pb-0 sm:items-start">
				<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
					<CardTitle>Users by Role</CardTitle>
				</div>
				<CardDescription>
					Distribution of registered users
				</CardDescription>
			</CardHeader>
			<CardContent className="my-auto">
				<ChartContainer
					className="mx-auto aspect-square max-h-72 w-full"
					config={chartConfig}
				>
					<PieChart accessibilityLayer>
						<Pie
							cornerRadius={8}
							data={chartData}
							dataKey="count"
							innerRadius={36}
							nameKey="role"
							outerRadius="88%"
							stroke="var(--card)"
							strokeWidth={4}
						>
							<LabelList
								className="fill-background font-medium"
								dataKey="count"
								fill="currentColor"
								fontWeight={500}
								formatter={(label) => {
									const n = Number(label);
									if (totalUsers === 0) return "0%";
									const pct = Math.round((n / totalUsers) * 100);
									return Number.isFinite(pct) ? `${pct}%` : String(label ?? "");
								}}
								position="inside"
								stroke="none"
							/>
						</Pie>
						<ChartLegend content={<ChartLegendContent nameKey="role" />} />
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
