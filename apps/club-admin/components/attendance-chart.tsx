"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { formatChartAxisTick, formatChartTooltipDate } from "@/components/formater";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { ArrowRightIcon } from "lucide-react";

type PeriodDays = 7 | 14 | 30 | 60 | 90;

const xAxisIntervalByPeriod: Record<PeriodDays, number> = {
	7: 0,
	14: 1,
	30: 3,
	60: 4,
	90: 6,
};

type AttendanceRow = {
	date: string;
	count: number;
};

const chartConfig = {
	attendance: {
		label: "Attendance",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function AttendanceChart({ data }: { data: AttendanceRow[] }) {
	const chartUid = useId().replace(/:/g, "");
	const idAreaGradient = `attendance-area-grad-${chartUid}`;
	const [periodDays, setPeriodDays] = useState<PeriodDays>(90);

	const chartRows = useMemo(
		() => data.slice(-periodDays),
		[periodDays, data]
	);

	const growthPct = useMemo(() => {
		const first = chartRows[0]?.count ?? 0;
		const last = chartRows.at(-1)?.count ?? first;
		if (!first) {
			return 0;
		}
		return ((last - first) / first) * 100;
	}, [chartRows]);

	let xAxisMinTickGap: number | undefined;
	if (periodDays <= 7) {
		xAxisMinTickGap = undefined;
	} else {
		xAxisMinTickGap = Math.max(8, Math.min(52, Math.floor(periodDays / 2)));
	}

	return (
		<Card className="md:col-span-2 lg:col-span-4 shadow-none">
			<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<CardTitle className="text-balance">Attendance Over Time</CardTitle>
				<Select
					onValueChange={(v) => {
						setPeriodDays(Number(v) as PeriodDays);
					}}
					value={String(periodDays)}
				>
					<SelectTrigger
						aria-label="Attendance time range"
						className="w-full min-w-36 sm:w-fit"
						size="sm"
					>
						<SelectValue placeholder="Range" />
					</SelectTrigger>
					<SelectContent align="end">
						<SelectItem value="7">Last 7 days</SelectItem>
						<SelectItem value="14">Last 14 days</SelectItem>
						<SelectItem value="30">Last 30 days</SelectItem>
						<SelectItem value="60">Last 60 days</SelectItem>
						<SelectItem value="90">Last 90 days</SelectItem>
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent>
				<ChartContainer
					className="aspect-auto h-60 w-full p-0"
					config={chartConfig}
				>
					<AreaChart
						accessibilityLayer
						data={chartRows}
						margin={{ left: 24, right: 8, top: 8, bottom: 0 }}
					>
						<defs>
							<linearGradient id={idAreaGradient} x1="0" x2="0" y1="0" y2="1">
								<stop
									offset="0%"
									stopColor="var(--chart-1)"
									stopOpacity={0.2}
								/>
								<stop
									offset="100%"
									stopColor="var(--chart-1)"
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid horizontal={false} strokeDasharray="2 2" />
						<XAxis
							axisLine={false}
							dataKey="date"
							interval={xAxisIntervalByPeriod[periodDays]}
							minTickGap={xAxisMinTickGap}
							tickFormatter={(value) =>
								formatChartAxisTick(String(value), periodDays)
							}
							tickLine={false}
							tickMargin={8}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									className="min-w-36"
									indicator="line"
									labelFormatter={(_, payload) => {
										const row = payload?.[0]?.payload as AttendanceRow | undefined;
										if (!row?.date) {
											return "";
										}
										return formatChartTooltipDate(row.date, "short");
									}}
								/>
							}
						/>
						<Area
							dataKey="count"
							dot={false}
							fill={`url(#${idAreaGradient})`}
							stroke="var(--chart-1)"
							strokeWidth={2}
							type="monotone"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex items-center justify-between">
				<div className="flex items-center gap-1 text-muted-foreground text-xs">
					<Delta value={growthPct}>
						<DeltaIcon />
						<DeltaValue />
					</Delta>
					<p className="inline-flex text-pretty">
						vs first day in last {periodDays} days.
					</p>
				</div>
				<Button className="text-muted-foreground" size="sm" variant="ghost">
				    View report
					<ArrowRightIcon aria-hidden="true" className="w-4 h-4 ml-1" />
				</Button>
			</CardFooter>
		</Card>
	);
}
