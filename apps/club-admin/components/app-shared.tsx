import type { ReactNode } from "react";
import { LayoutDashboard, Calendar, Users, CreditCard, BarChart3, Settings, HelpCircleIcon, ActivityIcon, Trophy, UserCheck } from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Overview",
		items: [
			{
				title: "Dashboard",
				path: "/dashboard",
				icon: <LayoutDashboard />,
				isActive: true,
			},
			{
				title: "Analytics",
				path: "/analytics",
				icon: <BarChart3 />,
			},
		],
	},
	{
		label: "Management",
		items: [
			{
				title: "Members",
				path: "/members",
				icon: <UserCheck />,
			},
			{
				title: "Weekly Roster",
				path: "/roster",
				icon: <Calendar />,
			},
			{
				title: "Caddie Profiles",
				path: "/caddies",
				icon: <Users />,
			},
			{
				title: "Competitions",
				path: "/competitions",
				icon: <Trophy />,
			},
			{
				title: "Payments",
				path: "/payments",
				icon: <CreditCard />,
			},
		],
	},
	{
		label: "System",
		items: [
			{
				title: "Settings",
				path: "/settings",
				icon: <Settings />,
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Help & Support",
		path: "/support",
		icon: <HelpCircleIcon />,
	},
	{
		title: "Platform Status",
		path: "/status",
		icon: <ActivityIcon />,
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
