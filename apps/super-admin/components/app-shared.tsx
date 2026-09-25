import type { ReactNode } from "react";
import { LayoutGridIcon, BuildingIcon, UsersIcon, ShieldIcon, BarChart3Icon, CreditCardIcon, FlagIcon, SettingsIcon } from "lucide-react";

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

// Sign out is rendered by the sidebar itself, as in the club-admin portal.
export const footerNavLinks: SidebarNavItem[] = [];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
