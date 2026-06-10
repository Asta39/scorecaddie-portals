import { cn } from "@/lib/utils";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

type Stat = {
	label: string;
	value: string;
	delta: number;
	footnote: string;
	lowerIsBetter: boolean;
};

export function DashboardStats({ data }: { data: any }) {
	const stats: Stat[] = [
		{
			label: "Pending Flags",
			value: String(data.unresolvedFlags),
			delta: 0, // Not available in current query
			footnote: "Action required",
			lowerIsBetter: true,
		},
		{
			label: "Total Caddies",
			value: String(data.totalCaddies),
			delta: 0,
			footnote: "Registered platform-wide",
			lowerIsBetter: false,
		},
		{
			label: "Total Clubs",
			value: String(data.totalClubs),
			delta: 0,
			footnote: "Active clubs",
			lowerIsBetter: false,
		},
		{
			label: "MRR",
			value: `KES ${data.mrr.toLocaleString()}`,
			delta: 0,
			footnote: "Monthly recurring revenue",
			lowerIsBetter: false,
		},
	];

	return (
		<>
			{stats.map((s) => (
				<Card className={cn("shadow-none dark:ring-0")} key={s.label}>
					<CardHeader>
						<CardTitle className="font-normal text-muted-foreground text-xs uppercase tracking-wider">
							{s.label}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						<p className="font-semibold text-2xl tabular-nums">{s.value}</p>
						<div className="flex items-center gap-1 text-xs">
							<span className="text-muted-foreground">{s.footnote}</span>
						</div>
					</CardContent>
				</Card>
			))}
		</>
	);
}
