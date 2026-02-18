import { IconType } from "@/components/ui/Icon";

export interface NavItem {
  name: string;
  icon: IconType;
  href: string;
  new?: boolean;
}

export interface NavProps {
  items: NavItem[];
}

export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { name: "Explore", icon: "layers", href: "/explore" },
  { name: "Convert", icon: "arrowLeftRight", href: "/convert" },
  { name: "Stats", icon: "stats", href: "/stats" },
  { name: "Learn", icon: "stats", href: "/learn" },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { name: "Home", icon: "home", href: "/" },
  { name: "Explore", icon: "layers", href: "/explore" },
  { name: "Convert", icon: "arrowLeftRight", href: "/convert" },
  { name: "Learn", icon: "book", href: "/learn" },
  { name: "Stats", icon: "stats", href: "/stats" },
];
