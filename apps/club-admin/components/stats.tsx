import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export type Stat = {
	label: string;
	value: string | number;
	icon: LucideIcon;
	hint: string;
};

export function DashboardStats({ stats }: { stats: Stat[] }) {
	return (
		<>
			{stats.map((s) => (
				<StatCard key={s.label} stat={s} />
			))}
		</>
	);
}

function StatCard({ stat }: { stat: Stat }) {
	const { label, value, icon: Icon, hint } = stat;
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-sm">
					{label}
				</CardTitle>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<p className="text-xs text-muted-foreground mt-1">
					{hint}
				</p>
			</CardContent>
		</Card>
	);
}
