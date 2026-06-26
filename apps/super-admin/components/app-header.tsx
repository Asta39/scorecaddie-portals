"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { navLinks } from "@/components/app-shared";
import { NavUser } from "@/components/nav-user";
import { SendIcon, BellIcon, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

export function AppHeader() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const pathname = usePathname();

	const activeItem = navLinks.find(
		(item) =>
			item.path &&
			(pathname === item.path ||
				(item.path !== "/" && pathname.startsWith(item.path)))
	);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6"
			)}
		>
			<div className="flex items-center gap-3">
				<CustomSidebarTrigger />
				<Separator
					className="mr-2 h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<AppBreadcrumbs />
			</div>
			<div className="flex items-center gap-3">
				<Button
					aria-label="Toggle theme"
					size="icon-sm"
					variant="outline"
					onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
				>
					{mounted && resolvedTheme === "dark" ? (
						<Sun className="h-4 w-4" />
					) : (
						<Moon className="h-4 w-4" />
					)}
				</Button>
				<Button size="icon-sm" variant="outline">
					<SendIcon
					/>
				</Button>
				<Button aria-label="Notifications" size="icon-sm" variant="outline">
					<BellIcon
					/>
				</Button>
				<Separator
					className="h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<NavUser />
			</div>
		</header>
	);
}
