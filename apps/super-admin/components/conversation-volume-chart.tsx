"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, useId, useState, useMemo, useEffect } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, subDays, subMonths, eachDayOfInterval, eachMonthOfInterval, isSameDay, startOfMonth, endOfMonth } from "date-fns";
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
		color: "#10b981",
	},
} satisfies ChartConfig;

export function ConversationVolumeChart({
	className,
	data,
	...props
}: ComponentProps<typeof Card> & { data?: any }) {
	const chartUid = useId().replace(/:/g, "");
	const idAreaGradient = `conversation-volume-area-grad-${chartUid}`;

	const [timeframe, setTimeframe] = useState<"7d" | "30d" | "6m" | "all">("30d");
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Group raw Supabase payments list by timeframe
	const chartRows = useMemo(() => {
		const rawPayments = data?.allPayments || [];
		const now = new Date();

		if (timeframe === "7d") {
			const start = subDays(now, 6);
			const days = eachDayOfInterval({ start, end: now });
			return days.map(d => {
				const label = format(d, "MMM dd");
				const amount = rawPayments
					.filter((p: any) => isSameDay(new Date(p.created_at), d))
					.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
				return { date: label, amount };
			});
		} else if (timeframe === "30d") {
			const start = subDays(now, 29);
			const days = eachDayOfInterval({ start, end: now });
			return days.map(d => {
				const label = format(d, "MMM dd");
				const amount = rawPayments
					.filter((p: any) => isSameDay(new Date(p.created_at), d))
					.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
				return { date: label, amount };
			});
		} else if (timeframe === "6m") {
			const start = subMonths(now, 5);
			const months = eachMonthOfInterval({ start, end: now });
			return months.map(m => {
				const label = format(m, "MMM yyyy");
				const mStart = startOfMonth(m);
				const mEnd = endOfMonth(m);
				const amount = rawPayments
					.filter((p: any) => {
						const date = new Date(p.created_at);
						return date >= mStart && date <= mEnd;
					})
					.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
				return { date: label, amount };
			});
		} else { // "all"
			if (rawPayments.length === 0) return [];
			const sorted = [...rawPayments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
			const firstDate = new Date(sorted[0].created_at);
			const months = eachMonthOfInterval({ start: firstDate, end: now });
			return months.map(m => {
				const label = format(m, "MMM yyyy");
				const mStart = startOfMonth(m);
				const mEnd = endOfMonth(m);
				const amount = rawPayments
					.filter((p: any) => {
						const date = new Date(p.created_at);
						return date >= mStart && date <= mEnd;
					})
					.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
				return { date: label, amount };
			});
		}
	}, [data, timeframe]);

	// Calculate growth percentage MoM or WoW
	const growthPercentage = useMemo(() => {
		const rawPayments = data?.allPayments || [];
		const now = new Date();
		let currentSum = 0;
		let prevSum = 0;

		if (timeframe === "7d") {
			const startCurr = subDays(now, 6);
			const startPrev = subDays(now, 13);
			currentSum = rawPayments
				.filter((p: any) => new Date(p.created_at) >= startCurr)
				.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
			prevSum = rawPayments
				.filter((p: any) => {
					const d = new Date(p.created_at);
					return d >= startPrev && d < startCurr;
				})
				.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
		} else if (timeframe === "30d") {
			const startCurr = subDays(now, 29);
			const startPrev = subDays(now, 59);
			currentSum = rawPayments
				.filter((p: any) => new Date(p.created_at) >= startCurr)
				.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
			prevSum = rawPayments
				.filter((p: any) => {
					const d = new Date(p.created_at);
					return d >= startPrev && d < startCurr;
				})
				.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
		} else if (timeframe === "6m") {
			const startCurr = subMonths(now, 5);
			const startPrev = subMonths(now, 11);
			currentSum = rawPayments
				.filter((p: any) => new Date(p.created_at) >= startCurr)
				.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
			prevSum = rawPayments
				.filter((p: any) => {
					const d = new Date(p.created_at);
					return d >= startPrev && d < startCurr;
				})
				.reduce((sum: number, p: any) => sum + p.amount_kes, 0);
		} else {
			return null;
		}

		if (prevSum === 0) return currentSum > 0 ? 100 : 0;
		return parseFloat((((currentSum - prevSum) / prevSum) * 100).toFixed(1));
	}, [data, timeframe]);

	if (!isMounted) {
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
						<CardTitle>Revenue timeline</CardTitle>
						<CardDescription>Loading revenue timeline...</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="h-[280px] w-full flex items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
				</CardContent>
			</Card>
		);
	}

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
						<CardTitle>Revenue timeline</CardTitle>
						{growthPercentage !== null && (
							<span className={cn(
								"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
								growthPercentage >= 0 
									? "bg-emerald-500/10 text-emerald-500" 
									: "bg-red-500/10 text-red-500"
							)}>
								{growthPercentage >= 0 ? `↑ +${growthPercentage}%` : `↓ ${growthPercentage}%`}
							</span>
						)}
					</div>
					<CardDescription>
						{timeframe === "7d" && "Daily payment volume for the last 7 days"}
						{timeframe === "30d" && "Daily payment volume for the last 30 days"}
						{timeframe === "6m" && "Monthly payment volume for the last 6 months"}
						{timeframe === "all" && "All-time monthly payment volume"}
					</CardDescription>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={timeframe}
						onChange={(e: any) => setTimeframe(e.target.value)}
						className="bg-muted text-foreground border border-border text-xs rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer font-medium hover:bg-muted/80 transition-colors"
					>
						<option value="7d">Last 7 days</option>
						<option value="30d">Last 30 days</option>
						<option value="6m">Last 6 months</option>
						<option value="all">All time</option>
					</select>
				</div>
			</CardHeader>
			<CardContent>
				<ChartContainer className="aspect-[22/8] min-h-[280px] w-full" config={chartConfig}>
					<AreaChart
						accessibilityLayer
						data={chartRows}
						margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
					>
						<defs>
							<linearGradient id={idAreaGradient} x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="0%"
									stopColor="#10b981"
									stopOpacity={0.25}
								/>
								<stop
									offset="100%"
									stopColor="#10b981"
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid className="stroke-border" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
						<XAxis
							axisLine={false}
							dataKey="date"
							tickLine={false}
							tickMargin={8}
							tick={{ fontSize: 10, fill: '#9ca3af' }}
						/>
						<YAxis
							axisLine={false}
							tick={{ className: "tabular-nums", fontSize: 10, fill: '#9ca3af' }}
							tickLine={false}
							tickMargin={8}
							width={40}
							tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									className="min-w-34 bg-card text-card-foreground border border-border"
									indicator="line"
								/>
							}
							cursor={false}
						/>
						<Area
							dataKey="amount"
							dot={false}
							fill={`url(#${idAreaGradient})`}
							stroke="#10b981"
							strokeWidth={2}
							type="monotone"
							isAnimationActive={false}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
