'use client'

import { LogoIcon } from "@/components/logo";
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
import { PlusIcon, SearchIcon } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export function AppSidebar() {
	const router = useRouter();
	const supabase = createClient();

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		window.location.href = '/login';
	};

	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader className="h-14 justify-center">
				<SidebarMenuButton className="h-12" render={<a href="/dashboard" />}>
					<img src="/logo.png" alt="Score Caddie" className="h-8 w-auto object-contain" />
					<span className="font-semibold text-lg ml-2">Score Caddie</span>
				</SidebarMenuButton>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
				</SidebarGroup>
				{navGroups.map((group, index) => (
					<NavGroup key={`sidebar-group-${index}`} {...group} />
				))}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					{footerNavLinks.map((item) => {
						const isSignOut = item.path === "#sign-out";
						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									className="text-muted-foreground"
									isActive={item.isActive}
									size="sm"
									onClick={isSignOut ? handleSignOut : undefined}
									render={isSignOut ? <button type="button" /> : <a href={item.path} />}
								>
									{item.icon}
									<span>{item.title}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
