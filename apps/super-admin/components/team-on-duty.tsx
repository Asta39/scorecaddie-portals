"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps } from "react";
import {
	Avatar,
	AvatarFallback,
} from "@/components/ui/avatar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { StatusIndicator } from "@/components/indicator";

function getInitials(name: string) {
	return name
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase())
		.join("")
		.substring(0, 2);
}

export function TeamOnDuty({
	className,
	data,
	...props
}: ComponentProps<typeof Card> & { data?: any }) {
	const clubs = data?.clubCaddies?.slice(0, 5) || [];

	return (
		<Card className={cn("shadow-none dark:ring-0", className)} {...(props as any)}>
			<CardHeader className="border-b">
				<CardTitle>Top Clubs</CardTitle>
				<CardDescription>Clubs with the most caddies</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<ul className="flex flex-col divide-y divide-border">
					{clubs.map((t: any, i: number) => (
						<li
							className="flex items-center gap-2 p-3 first:pt-0 last:pb-0 sm:gap-3"
							key={t.name + i}
						>
							<Avatar className="size-8">
								<AvatarFallback>{getInitials(t.name)}</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1 pr-1">
								<p className="truncate font-medium text-foreground text-sm leading-snug">
									{t.name}
								</p>
								<p className="flex items-center gap-2 text-[10px] leading-snug text-muted-foreground">
									<span className="flex shrink-0 items-center gap-1">
										<StatusIndicator
											color={t.active > 0 ? "emerald" : "amber"}
											pulse={t.active > 0}
										/>
										{t.active} Active
									</span>
									<span className="inline-flex size-1 rounded-full bg-foreground/80" />
									<span className="tabular-nums">{t.caddies} Total</span>
								</p>
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
