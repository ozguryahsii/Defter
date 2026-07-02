import { LayoutDashboard, PiggyBank, Users, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/groups", label: "Gruplar", icon: Users },
  { href: "/budget", label: "Kişisel Bütçe", icon: PiggyBank },
];
