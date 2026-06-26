import type { ReactNode } from "react";
import { LayoutGridIcon, BuildingIcon, UsersIcon, ShieldIcon, BarChart3Icon, CreditCardIcon, FlagIcon, SettingsIcon, LogOutIcon } from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		items: [
			{
				title: "Dashboard",
				path: "/dashboard",
				icon: <LayoutGridIcon />,
			},
		],
	},
	{
		label: "Management",
		items: [
			{
				title: "Clubs",
				path: "/clubs",
				icon: <BuildingIcon />,
			},
			{
				title: "Caddies",
				path: "/caddies",
				icon: <UsersIcon />,
			},
			{
				title: "Admins",
				path: "/admins",
				icon: <ShieldIcon />,
			},
		],
	},
	{
		label: "Data & Finance",
		items: [
			{
				title: "Analytics",
				path: "/analytics",
				icon: <BarChart3Icon />,
			},
			{
				title: "Payments",
				path: "/payments",
				icon: <CreditCardIcon />,
			},
		],
	},
	{
		label: "System",
		items: [
			{
				title: "Flags",
				path: "/flags",
				icon: <FlagIcon />,
			},
			{
				title: "Config",
				path: "/config",
				icon: <SettingsIcon />,
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Sign Out",
		path: "#sign-out", // handled in frontend component
		icon: <LogOutIcon />,
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
