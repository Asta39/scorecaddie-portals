"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import {
	Avatar,
	AvatarFallback,
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
import { UserIcon, SettingsIcon, LogOutIcon } from "lucide-react";

export function NavUser() {
	const router = useRouter();
	const supabase = createClient();
	const [user, setUser] = useState({ name: "Secretary", email: "loading...", initial: "S", role: "Secretary" });

	useEffect(() => {
		const loadUser = async () => {
			const { data: { user: authUser } } = await supabase.auth.getUser()
			if (authUser) {
				const { data: admin } = await supabase
					.from('club_admins')
					.select('name')
					.eq('user_id', authUser.id)
					.single()
				
				const name = admin?.name || "Secretary";
				setUser({
					name,
					email: authUser.email || "",
					initial: name.charAt(0).toUpperCase(),
					role: "Club Admin"
				});
			}
		}
		loadUser();
	}, []);

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		router.push('/login');
		router.refresh();
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger nativeButton={false} render={<Avatar className="size-8 cursor-pointer" />}><AvatarFallback className="bg-primary text-white">{user.initial}</AvatarFallback></DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuItem className="flex items-center justify-start gap-2">
					<DropdownMenuLabel className="flex items-center gap-3">
						<Avatar className="size-10">
							<AvatarFallback className="bg-primary text-white">{user.initial}</AvatarFallback>
						</Avatar>
						<div>
							<span className="font-medium text-foreground">{user.name}</span>{" "}
							<br />
							<div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
								{user.email}
							</div>
							<div className="mt-0.5 text-[10px] text-muted-foreground">
								{user.role}
							</div>
						</div>
					</DropdownMenuLabel>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={() => router.push('/settings')}>
						<SettingsIcon />
						Settings
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer"
						variant="destructive"
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
