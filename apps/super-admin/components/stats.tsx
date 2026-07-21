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
				<div className="card p-5" key={s.label}>
					<div className="font-normal text-muted-foreground text-xs uppercase tracking-wider">
						{s.label}
					</div>
					<p className="font-semibold money-lg mt-1.5">{s.value}</p>
					<div className="flex items-center gap-1 text-xs mt-2">
						<span className="text-muted-foreground">{s.footnote}</span>
					</div>
				</div>
			))}
		</>
	);
}
