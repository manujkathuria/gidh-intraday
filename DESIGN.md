---
name: Gidh Intraday
description: High-density clinical monochrome quantitative trading terminal
colors:
  background: "#121212"
  foreground: "#ECECEC"
  surface: "#1A1A1A"
  surface-muted: "#222222"
  surface-hover: "#2C2C2C"
  surface-border: "#303030"
  primary: "#F3F4F6"
  primary-foreground: "#121212"
typography:
  display:
    fontFamily: "var(--font-geist-mono), monospace"
    fontSize: "1.25rem"
    fontWeight: 800
    letterSpacing: "-0.02em"
  body:
    fontFamily: "var(--font-geist-mono), monospace"
    fontSize: "0.8125rem"
    lineHeight: 1.4
  mono:
    fontFamily: "var(--font-geist-mono), monospace"
    fontVariantNumeric: "tabular-nums"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
---

# Design System: Gidh Intraday

## Overview
Gidh Intraday uses an **institutional monochrome design language** inspired by professional market terminals (Bloomberg, Codex, Linear). The interface prioritizes scanability, rapid comprehension, and zero emotional bias.

## Colors
- **Carbon Dark Mode** (`#121212`): Main terminal background.
- **Card Surfaces** (`#1A1A1A`): Hairline bordered panels (`#303030`).
- **Elevated Surfaces** (`#222222`): Badges, inputs, and selected tabs.
- **Pure Contrast Text** (`#ECECEC` / `#F3F4F6`): High-legibility crisp off-white.
- **Muted Elements** (`#71717A`): Secondary labels and inactive indicators.

## Typography
- All numerical metrics and data tables use **tabular figures** (`font-variant-numeric: tabular-nums`) to prevent jitter and layout shift during real-time tick streaming.
- Monospace font family (`Geist Mono`, `ui-monospace`) throughout the application for tabular data integrity.

## Layout & Hierarchy
- **Header Control Bar**: Fixed top navigation with integrated live ticker / replay scrubber.
- **5-Slot Margin Matrix**: High-visibility risk slots with immediate status badges.
- **Dense Data Grid**: Hairline dividers with compact padding (`py-1.5 px-3`) to maximize screen real estate.

## Elevation & Depth
- Flat, subtle elevation. Borders (`1px solid #303030`) replace heavy drop shadows.
- Backdrop blur (`backdrop-blur-md`) applied to floating modals and sticky overlays.

## Do's and Don'ts
- **DO**: Use tabular numbers (`tabular-nums`) for all stock prices, changes, and volumes.
- **DO**: Maintain pure monochrome styling for badges, filters, and buttons.
- **DON'T**: Introduce rainbow colors or bright neon accents.
- **DON'T**: Nest multiple heavy border cards inside cards.
