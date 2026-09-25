"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { footerNavLinks, navGroups } from "@/components/app-shared";
import { PlusIcon, SearchIcon, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { GlobalSearch } from "@/components/global-search";

// Same structure as the club-admin portal's sidebar: floating panel, brand
// row, a primary quick action with search beside it, grouped navigation,
// and account links with sign-out in the footer.
export function AppSidebar() {
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const supabase = createClient();

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		window.location.href = "/login";
	};

	return (
		<>
			<Sidebar collapsible="icon" variant="floating">
				<SidebarHeader className="h-14 justify-center">
					<SidebarMenuButton render={<a href="/dashboard" />}>
						<img src="/logo.png" alt="Score Caddie" className="size-6" />
						<span className="font-bold tracking-tight">Score Caddie</span>
					</SidebarMenuButton>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarMenuItem className="flex items-center gap-2">
							<SidebarMenuButton
								className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
								tooltip="Add Club"
								render={<a href="/clubs?new=1" />}
							>
								<PlusIcon />
								<span>Add Club</span>
							</SidebarMenuButton>
							<Button
								aria-label="Search"
								className="size-8 group-data-[collapsible=icon]:opacity-0"
								size="icon"
								variant="outline"
								onClick={() => setIsSearchOpen(true)}
							>
								<SearchIcon />
								<span className="sr-only">Search</span>
							</Button>
						</SidebarMenuItem>
					</SidebarGroup>
					{navGroups.map((group, index) => (
						<NavGroup key={`sidebar-group-${index}`} {...group} />
					))}
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu className="mt-2">
						{footerNavLinks.map((item) => (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton className="text-muted-foreground" isActive={item.isActive} size="sm" render={<a href={item.path} />}>
									{item.icon}
									<span>{item.title}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
						<SidebarMenuItem>
							<SidebarMenuButton onClick={handleSignOut} className="text-muted-foreground" size="sm">
								<LogOut />
								<span>Sign out</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
		</>
	);
}
