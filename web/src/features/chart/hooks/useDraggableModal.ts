"use client";

import { useEffect, useRef } from "react";

export function useDraggableModal(isOpen: boolean, symbol: string) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number }>({
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });
  const prevOpenRef = useRef(false);
  const prevSymbolRef = useRef(symbol);

  useEffect(() => {
    const isFreshOpen = isOpen && !prevOpenRef.current;
    const isSymbolChange = symbol !== prevSymbolRef.current;
    if (isFreshOpen || isSymbolChange) {
      dragPosRef.current = { x: 0, y: 0 };
      if (modalRef.current) {
        modalRef.current.style.transform = `translate(0px, 0px)`;
      }
    }
    prevOpenRef.current = isOpen;
    prevSymbolRef.current = symbol;
  }, [isOpen, symbol]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    const header = e.currentTarget as HTMLElement;
    header.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: dragPosRef.current.x,
      startPosY: dragPosRef.current.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !modalRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const nextX = dragStartRef.current.startPosX + dx;
    const nextY = dragStartRef.current.startPosY + dy;
    dragPosRef.current = { x: nextX, y: nextY };
    modalRef.current.style.transform = `translate(${nextX}px, ${nextY}px)`;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return {
    modalRef,
    dragPos: dragPosRef.current,
    dragHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
