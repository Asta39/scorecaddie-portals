"use client";

import { usePathname } from "next/navigation";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import React from "react";

const routeTitleMap: Record<string, string> = {
  dashboard: "Dashboard",
  clubs: "Clubs",
  caddies: "Caddies",
  admins: "Admins",
  analytics: "Analytics",
  payments: "Payments",
  flags: "Flags",
  config: "Platform Config"
};

export function AppBreadcrumbs() {
	const pathname = usePathname();
	if (!pathname || pathname === "/") return null;

	// Filter out segment strings
	const segments = pathname.split("/").filter(Boolean);

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{segments.map((segment, index) => {
					const path = `/${segments.slice(0, index + 1).join("/")}`;
					const isLast = index === segments.length - 1;
					
					// Decode URI component (e.g. spaces) and format label
					let title = routeTitleMap[segment];
					if (!title) {
						const decoded = decodeURIComponent(segment);
						// If it looks like a Supabase UUID or numeric ID, label as "Detail" or keep it short
						if (decoded.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) || decoded.length > 20) {
							title = "Details";
						} else {
							title = decoded.charAt(0).toUpperCase() + decoded.slice(1);
						}
					}

					return (
						<React.Fragment key={path}>
							{index > 0 && <BreadcrumbSeparator className="opacity-60" />}
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage className="font-semibold text-foreground">
										{title}
									</BreadcrumbPage>
								) : (
									<Link href={path} className="text-muted-foreground hover:text-foreground transition-colors">
										{title}
									</Link>
								)}
							</BreadcrumbItem>
						</React.Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
