"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarIcon,
  HomeIcon,
  MailIcon,
  PencilIcon,
  Github,
  Linkedin,
  Twitter,
  Youtube,
  QrCode,
  History,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dock, DockIcon } from "@/components/ui/dock";

const Icons = {
  calendar: CalendarIcon,
  email: MailIcon,
  history: History,
  x: Twitter,
  youtube: Youtube,
  qr: QrCode,
};

const DATA = {
  navbar: [
    { href: "/dashboard", icon: HomeIcon, label: "Home" },
    { href: "/my-qr", icon: QrCode, label: "My QR" },
  ],
  contact: {
    social: {
      "Upcoming Events": {
        name: "Upcoming Events",
        url: "/events",
        icon: Icons.calendar,
      },
      "Attendance History": {
        name: "Attendance History",
        url: "/attendance-history",
        icon: Icons.history,
      },
    },
  },
};

export function AppDock() {
  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center">
      <TooltipProvider>
        <Dock direction="middle">
          {DATA.navbar.map((item) => (
            <DockIcon key={item.label}>
              <Tooltip>
                <TooltipTrigger>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full",
                    )}
                  >
                    <item.icon className="size-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
          <Separator orientation="vertical" className="h-full" />
          {Object.entries(DATA.contact.social).map(([name, social]) => (
            <DockIcon key={name}>
              <Tooltip>
                <TooltipTrigger>
                  <Link
                    href={social.url}
                    aria-label={social.name}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full",
                    )}
                  >
                    <social.icon className="size-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{name}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
        </Dock>
      </TooltipProvider>
    </div>
  );
}
