import { PresenceDonut, ExperienceChart } from "@/components/dashboard/DashboardCharts";
import { CheckedInTable } from "@/components/dashboard/CheckedInTable";
import { DashboardStats, Stat } from "@/components/stats";
import { AttendanceChart } from "@/components/attendance-chart";
import { SubscriptionMixChart } from "@/components/subscription-mix-chart";
import { Clock } from "lucide-react";
import Link from "next/link";

export function Dashboard({
	stats,
	presenceData,
	experienceData,
	attendanceHistory,
	subscriptionData,
	checkedInCaddies,
	clubId,
	expiringCaddiesCount,
}: {
	stats: Stat[];
	presenceData: any[];
	experienceData: any[];
	attendanceHistory: any[];
	subscriptionData: any[];
	checkedInCaddies: any[];
	clubId: string;
	expiringCaddiesCount: number;
}) {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<DashboardStats stats={stats} />
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="lg:col-span-1">
					<PresenceDonut data={presenceData} />
				</div>
				<div className="lg:col-span-1">
					<ExperienceChart data={experienceData} />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="lg:col-span-1">
					<AttendanceChart data={attendanceHistory} />
				</div>
				<div className="lg:col-span-1">
					<SubscriptionMixChart data={subscriptionData} />
				</div>
			</div>

			<CheckedInTable initialCaddies={checkedInCaddies} clubId={clubId} />

			{expiringCaddiesCount > 0 && (
				<div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
					<Clock className="text-amber-500" size={18} />
					<div>
						<p className="text-sm font-semibold text-amber-900">
							{expiringCaddiesCount} caddie{expiringCaddiesCount > 1 ? "s" : ""} expiring within 7 days
						</p>
						<p className="text-xs text-amber-700">
							Head to <Link href="/payments" className="font-bold underline">Payments</Link> to renew their subscriptions before they lose marketplace visibility.
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
