import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ArrowRightIcon, FlagIcon, AlertTriangleIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function RecentConversations({
	className,
	data,
	...props
}: ComponentProps<typeof Card> & { data?: any }) {
	const flags = data?.flags || [];

	return (
		<Card
			className={cn("gap-0 shadow-none md:col-span-2 dark:ring-0 flex flex-col", className)}
			{...(props as any)}
		>
			<CardHeader className="border-b">
				<CardTitle>Unresolved Flags</CardTitle>
				<CardDescription>Latest reported issues requiring attention</CardDescription>
			</CardHeader>
			<CardContent className="p-0 flex-1 overflow-auto">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="pl-6">Club</TableHead>
							<TableHead>Type</TableHead>
							<TableHead className="hidden sm:table-cell">Details</TableHead>
							<TableHead className="pr-6 text-right">Time</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{flags.map((f: any) => (
							<TableRow
								className="h-14 hover:bg-transparent"
								key={f.id}
							>
								<TableCell className="max-w-36 truncate pl-6 font-medium">
									{f.clubs?.name || "Unknown Club"}
								</TableCell>
								<TableCell>
									<Badge variant={f.flag_type === "payment_issue" ? "destructive" : "secondary"} className="capitalize">
										{f.flag_type?.replace(/_/g, " ")}
									</Badge>
								</TableCell>
								<TableCell className="hidden max-w-40 sm:table-cell">
									<span className="line-clamp-1 text-muted-foreground text-sm" title={f.details}>
										{f.details}
									</span>
								</TableCell>
								<TableCell className="pr-6 text-right text-muted-foreground text-sm whitespace-nowrap">
									{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
								</TableCell>
							</TableRow>
						))}
						{flags.length === 0 && (
							<TableRow>
								<TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
									No unresolved flags found
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				<div className="flex justify-center border-t p-2 mt-auto">
					<Button size="sm" variant="ghost" asChild>
                        <a href="/flags">
                            View all flags
                            <ArrowRightIcon aria-hidden="true" className="ml-1 h-4 w-4 inline" />
                        </a>
                    </Button>
				</div>
			</CardContent>
		</Card>
	);
}
