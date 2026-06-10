import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ArrowRightIcon, CreditCardIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function SupportActivity({
	className,
	data,
	...props
}: ComponentProps<typeof Card> & { data?: any }) {
	const recentPayments = data?.recentPayments || [];

	return (
		<Card className={cn("gap-0 shadow-none dark:ring-0 flex flex-col", className)} {...(props as any)}>
			<CardHeader className="border-b">
				<CardTitle>Recent Payments</CardTitle>
				<CardDescription>Latest confirmed subscriptions.</CardDescription>
			</CardHeader>
			<CardContent className="px-0 flex-1 overflow-auto">
				<ul className="flex flex-col divide-y divide-border">
					{recentPayments.map((item: any) => (
						<li className="flex h-18 items-center gap-3 px-3" key={item.id}>
							<span
								aria-hidden="true"
								className="flex size-10 shrink-0 items-center justify-center [&_svg]:size-4 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 rounded-full"
							>
								<CreditCardIcon />
							</span>
							<div className="min-w-0 flex-1 space-y-1">
								<p className="line-clamp-2 text-pretty text-foreground text-xs leading-snug">
									<span className="font-semibold">KES {item.amount_kes}</span> - {item.clubs?.name || "Unknown Club"}
								</p>
								<p className="text-muted-foreground text-xs tabular-nums">
									{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
								</p>
							</div>
						</li>
					))}
					{recentPayments.length === 0 && (
						<li className="flex h-18 items-center justify-center text-muted-foreground text-sm">
							No recent payments
						</li>
					)}
				</ul>
			</CardContent>
			<div className="flex items-center justify-center p-2 border-t mt-auto">
				<Button size="sm" variant="ghost" render={<a href="/payments" />} nativeButton={false}>
					View All
					<ArrowRightIcon aria-hidden="true" className="ml-1 h-4 w-4 inline" />
				</Button>
			</div>
		</Card>
	);
}
