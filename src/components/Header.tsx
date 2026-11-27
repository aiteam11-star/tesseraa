import Link from "next/link";
import { getUserOrNull } from "@/lib/session";
import { AccountMenu } from "./AccountMenu";
import { HeaderControls } from "./HeaderControls";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { rolesOf } from "@/lib/roles";
import { RoleSwitch } from "./RoleSwitch";

export async function Header() {
  const user = await getUserOrNull();
  const links = user
    ? [{ href: "/dashboard", label: "Dashboard" }, { href: "/matches", label: "Matches" }, { href: "/projects", label: "Projects" }]
    : [];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 rounded-md" aria-label="Tessera home">
          <Logo />
          <span className="font-display text-2xl leading-none">Tessera</span>
        </Link>
        {links.length > 0 && <NavLinks links={links} />}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {user?.role === "client" && <Link href="/brief/new" className="btn btn-primary !min-h-[36px] !px-3 !py-1.5">New brief</Link>}
          {user && rolesOf(user).length > 1 && <RoleSwitch role={user.role as "client" | "freelancer"} />}
          <HeaderControls />
          {user ? (
            <AccountMenu name={user.name} role={user.role as "client" | "freelancer"} roles={rolesOf(user)} hue={user.hue} avatarUrl={user.avatarFileId ? `/api/files/${user.avatarFileId}` : null} />
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5">Log in</Link>
              <Link href="/signup" className="btn btn-primary !min-h-[36px] !px-3 !py-1.5">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
