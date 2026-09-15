"use client";

import React from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LogIn, LogOut, User as UserIcon, Shield } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

export const UserAuthButton: React.FC = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface-muted animate-pulse outline -outline-offset-1 outline-black/5 dark:outline-white/10 shrink-0" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="px-2 py-1 rounded bg-foreground text-background font-bold text-[11px] flex items-center gap-1.5 shadow-xs hover:opacity-90 transition cursor-pointer shrink-0"
        title="Sign in with Google"
      >
        <LogIn className="w-3 h-3" />
        <span>Sign In</span>
      </button>
    );
  }

  const initials = (user.displayName || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Menu as="div" className="relative inline-block text-left shrink-0">
      <MenuButton className="flex items-center rounded-full focus:outline-none focus:ring-1 focus:ring-foreground transition cursor-pointer">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || "User"}
            className="inline-flex size-6 items-center justify-center rounded-full object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/15"
          />
        ) : (
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface-muted border border-surface-border outline -outline-offset-1 outline-black/5 dark:outline-white/10">
            <span className="text-[10px] font-bold text-foreground">{initials}</span>
          </span>
        )}
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-50 mt-1.5 w-48 origin-top-right rounded-lg bg-surface border border-surface-border p-1 shadow-lg backdrop-blur-md focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        {/* User Info Header */}
        <div className="px-2.5 py-2 border-b border-surface-border flex flex-col gap-0.5">
          <span className="text-xs font-bold text-foreground truncate">
            {user.displayName || "Quant Operator"}
          </span>
          <span className="text-[10px] text-foreground/50 truncate font-mono">
            {user.email}
          </span>
        </div>

        {/* Status Badge */}
        <div className="px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-foreground/60">
          <Shield className="w-3 h-3 text-foreground/70" />
          <span>Operator Verified</span>
        </div>

        <div className="h-px bg-surface-border my-0.5" />

        {/* Sign Out Action */}
        <MenuItem>
          {({ focus }) => (
            <button
              onClick={signOut}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-foreground transition cursor-pointer ${
                focus ? "bg-surface-hover" : ""
              }`}
            >
              <LogOut className="w-3.5 h-3.5 text-foreground/70" />
              <span>Sign Out</span>
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};
