"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserIcon, LogOutIcon, Moon, Sun, Monitor } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function NavUser() {
	const router = useRouter();
	const supabase = createClient();
	const [user, setUser] = useState<{ email: string; name: string } | null>(null);
	const { setTheme } = useTheme();

	useEffect(() => {
		const fetchUser = async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (session?.user) {
				setUser({
					email: session.user.email || "",
					name: session.user.user_metadata?.full_name || "Super Admin",
				});
			}
		};
		fetchUser();
	}, []);

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		window.location.href = '/login';
	};

	if (!user) return <Avatar className="size-8 animate-pulse bg-muted" />;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Avatar className="size-8" />}><AvatarImage src="" /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuItem className="flex items-center justify-start gap-2">
					<DropdownMenuLabel className="flex items-center gap-3">
						<Avatar className="size-10">
							<AvatarImage src="" />
							<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<div>
							<span className="font-medium text-foreground">{user.name}</span>{" "}
							<br />
							<div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
								{user.email}
							</div>
						</div>
					</DropdownMenuLabel>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<UserIcon />
						Profile
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={() => setTheme("light")}>
						<Sun className="mr-2 h-4 w-4" />
						Light Mode
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("dark")}>
						<Moon className="mr-2 h-4 w-4" />
						Dark Mode
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("system")}>
						<Monitor className="mr-2 h-4 w-4" />
						System Theme
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer text-destructive focus:bg-destructive/10"
						onClick={handleSignOut}
					>
						<LogOutIcon />
						Log out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
