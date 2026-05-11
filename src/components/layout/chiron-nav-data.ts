import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BadgeCheck,
  ClipboardList,
  Droplets,
  Eye,
  FileStack,
  Headset,
  LayoutGrid,
  Lightbulb,
  Package,
  Receipt,
  ShieldCheck,
  Wrench,
} from "lucide-react";

export type NavChild = {
  href: string;
  label: string;
};

export type NavGroupItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavChild[];
};

export type NavSingleItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

export type ChironNavEntry = NavGroupItem | NavSingleItem;

function isSingle(e: ChironNavEntry): e is NavSingleItem {
  return "href" in e && typeof (e as NavSingleItem).href === "string";
}

export function entryIsSingle(e: ChironNavEntry): e is NavSingleItem {
  return isSingle(e);
}

export const CHIRON_NAV_TREE: ChironNavEntry[] = [
  {
    id: "ticket-desk",
    label: "Ticket desk",
    icon: Headset,
    children: [
      { href: "/ticket-desk", label: "Desk home" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/patients", label: "Patients" },
      { href: "/orders", label: "Worklist" },
      { href: "/results", label: "Results" },
    ],
  },
  {
    id: "send-receive",
    label: "Send / receive",
    icon: ArrowLeftRight,
    children: [
      { href: "/send-receive", label: "Overview" },
      { href: "/interoperability", label: "FHIR & export" },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: Receipt,
    children: [
      { href: "/billing", label: "Invoices" },
      { href: "/billing/new", label: "New invoice" },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileStack,
    children: [
      { href: "/documents", label: "Document centre" },
      { href: "/results", label: "Results workspace" },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    children: [
      { href: "/maintenance", label: "Overview" },
      { href: "/catalogue/edit", label: "Test rules & ranges" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: Lightbulb,
    children: [
      { href: "/administration", label: "Overview" },
      { href: "/users", label: "User accounts" },
      { href: "/catalogue", label: "Test catalogue" },
      { href: "/catalogue/edit", label: "Configure tests" },
    ],
  },
  {
    id: "quality-programmes",
    label: "Quality programmes",
    icon: ShieldCheck,
    children: [{ href: "/quality/programmes", label: "Programmes" }],
  },
  {
    id: "quality-instruments",
    label: "Quality instruments",
    icon: BadgeCheck,
    children: [{ href: "/quality/instruments", label: "Instrumentation" }],
  },
  {
    id: "quality-stains",
    label: "Quality stains",
    icon: Droplets,
    children: [{ href: "/quality/stains", label: "Stains & reagents" }],
  },
  {
    id: "reports",
    label: "Reports",
    icon: ClipboardList,
    href: "/reports",
  },
  {
    id: "security",
    label: "Security",
    icon: Eye,
    children: [
      { href: "/security", label: "Overview" },
      { href: "/users", label: "Access control" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    children: [
      { href: "/inventory", label: "Stock overview" },
      { href: "/inventory/reagents", label: "Reagents" },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    icon: LayoutGrid,
    children: [
      { href: "/setup", label: "Setup home" },
      { href: "/settings", label: "Lab profile" },
    ],
  },
];
