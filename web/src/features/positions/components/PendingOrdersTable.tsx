"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, ExternalLink, Activity, Clock } from "lucide-react";
import { ManagedOrder } from "@/lib/api";

interface Props {
  orders: ManagedOrder[];
  onCancelOrder: (id: string) => Promise<boolean>;
}

export const PendingOrdersTable: React.FC<Props> = ({ orders, onCancelOrder }) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const pendingOrders = orders.filter(
    (o) => o.status === "PENDING" || o.status === "TRIGGERING" || o.status === "SUBMITTED"
  );

  if (pendingOrders.length === 0) return null;

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    await onCancelOrder(id);
    setCancellingId(null);
  };

  return (
    <div className="w-full bg-surface border border-surface-border rounded-xl overflow-hidden shadow-xs">
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between bg-surface-muted/40">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Pending / Open Orders ({pendingOrders.length})
          </h3>
        </div>
        <span className="text-[10px] text-foreground/50 font-mono">
          Synthetic Limit Engine
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-surface-border/60 text-[10px] font-semibold text-foreground/50 uppercase tracking-wider bg-surface-muted/20">
              <th className="px-4 py-2.5">Order ID</th>
              <th className="px-3 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Side</th>
              <th className="px-3 py-2.5 text-right">Quantity</th>
              <th className="px-3 py-2.5 text-right">Limit Price</th>
              <th className="px-3 py-2.5 text-right">Margin</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-right">Created</th>
              <th className="px-4 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/40 font-mono">
            {pendingOrders.map((order) => {
              const isLong = order.side === "LONG";
              const isCancelling = cancellingId === order.id;

              return (
                <tr
                  key={order.id}
                  className="hover:bg-surface-muted/30 transition-colors group"
                >
                  {/* Order ID */}
                  <td className="px-4 py-3 text-[11px] text-foreground/50">
                    {order.id.slice(0, 12)}...
                  </td>

                  {/* Symbol */}
                  <td className="px-3 py-3 font-bold text-foreground font-sans">
                    <Link
                      href={`/chart?symbol=${encodeURIComponent(order.symbol)}`}
                      className="inline-flex items-center gap-1.5 hover:underline text-foreground"
                    >
                      <span>{order.symbol}</span>
                      <ExternalLink className="w-3 h-3 text-foreground/30 group-hover:text-foreground/70 transition" />
                    </Link>
                  </td>

                  {/* Side */}
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-sans ${
                        isLong
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {isLong ? "BUY" : "SELL"}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="px-3 py-3 text-right font-bold text-foreground tabular-nums">
                    {order.quantity} <span className="text-[10px] font-normal text-foreground/40 font-sans">sh</span>
                  </td>

                  {/* Limit Price */}
                  <td className="px-3 py-3 text-right font-bold text-foreground tabular-nums">
                    ₹{(order.limit_price || 0).toFixed(2)}
                  </td>

                  {/* Margin */}
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/70">
                    ₹{order.margin_inr.toLocaleString()}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {order.status}
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="px-3 py-3 text-right text-[11px] text-foreground/50 tabular-nums font-sans">
                    {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={isCancelling}
                      className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 mx-auto shadow-2xs font-sans disabled:opacity-50"
                    >
                      {isCancelling ? (
                        <Activity className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      <span>Cancel</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
