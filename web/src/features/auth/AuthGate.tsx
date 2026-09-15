"use client";

import React from "react";
import { ShieldAlert, LogIn, Activity } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground select-none">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-6 h-6 animate-spin text-foreground/60" />
          <span className="text-xs font-semibold tracking-wider text-foreground/50 uppercase">
            Verifying Authentication...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground p-4 select-none">
        <div className="w-full max-w-sm bg-surface border border-surface-border rounded-xl p-6 shadow-2xl flex flex-col items-center text-center gap-5">
          {/* Eagle / Falcon Quant Brand Icon */}
          <div className="w-12 h-12 rounded-xl bg-surface-muted border border-surface-border flex items-center justify-center shadow-xs">
            <span className="text-2xl">🦅</span>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-base font-black tracking-tight text-foreground uppercase">
              Gidh Intraday War Room
            </h1>
            <p className="text-xs text-foreground/60 font-medium">
              Real-time 210-Civ Market Scouting & Quant Replay Engine
            </p>
          </div>

          <div className="w-full h-px bg-surface-border" />

          <button
            onClick={signInWithGoogle}
            className="w-full py-2.5 px-4 rounded-lg bg-foreground text-background font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-foreground/40 font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Whitelisted Quant Operator Access Only</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
