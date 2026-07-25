# Theta Design Polish Plan

## Mission

Transform Theta into a world-class, premium Project Management platform.

This is NOT a feature sprint. This is a DESIGN REFINEMENT sprint. The goal is to make Theta feel as polished as Apple while maintaining the power of modern PM platforms.

## Target Inspiration

- **70% Apple** — elegance, restraint, precision, calmness
- **20% Linear** — speed, density, keyboard-first, hairline borders
- **10% Theta Identity** — Nova AI, blue/purple accents, flow-based philosophy

---

## Current Issues

| Issue | Current State | Target |
|---|---|---|
| Border Radius | `8px` (0.5rem) base — too small | `12px` for cards, `6px` for controls |
| Shadows | Relies on external `@vibe/core` variables — unpredictable | Define all shadow tokens locally in CSS |
| Borders | Mix of `var(--ui-border-color)` and Tailwind — inconsistent | Unified `border-border` system, lower contrast |
| Typography | Figtree + Poppins with no defined scale | Create proper type scale with tokens |
| Spacing | Arbitrary values throughout | `8px` grid system with consistent tokens |
| Vibe Dependency | 6+ components wrap `@vibe/core` — loss of visual control | Remove Vibe wrappers, pure Tailwind |
| Theme Variables | Vibe CSS variables undefined in `globals.css` — unreliable | Self-contained theme in `globals.css` |
| Animations | Inconsistent or missing | 150–200ms transitions, scale-on-press, smooth easing |

---

## Design Principles

1. **Calm before powerful** — reduce visual noise, increase hierarchy, intentional whitespace
2. **8px spacing grid** — every margin and padding follows a consistent rhythm
3. **Semantic color system** — neutral surfaces dominate, brand highlights active/primary states only
4. **Subtle borders and shadows** — borders at lower contrast, shadows for elevation not decoration
5. **150–200ms transitions** — smooth but never flashy, with `cubic-bezier(0.16, 1, 0.3, 1)` deceleration
6. **Progressive disclosure** — surfaces start simple, reveal complexity on interaction
7. **Typography hierarchy** — `text-display` (32px) → `text-heading` (24px) → `text-title` (16px) → `text-body` (14px) → `text-caption` (12px) → `text-micro` (11px)

---

## Implementation Plan

### Step 1: `app/globals.css` — Complete Overhaul

Define ALL visual tokens locally. Stop relying on `@vibe/core` CSS variables.

**Light theme** — new tokens needed:
- `--border-subtle` — softer alternative to `--border`
- `--radius-sm / --radius-md / --radius-lg / --radius-xl / --radius-full`
- `--shadow-xs / --shadow-sm / --shadow-md / --shadow-lg / --shadow-xl`
- `--duration-fast / --duration-normal / --duration-slow`
- `--ease-out / --ease-in-out`
- `--space-1` through `--space-20`

**Dark theme** — same new tokens with inverted values.

**Base layer additions**:
- Global transition on all interactive elements
- `button:active:not(:disabled)` with `transform: scale(0.97)`
- Smooth scrollbar styling

### Step 2: `tailwind.config.ts` — Extend Design Tokens

Add to `extend`:
- `borderRadius` — map to `--radius-*` variables
- `boxShadow` — map to `--shadow-*` variables
- `spacing` — add gap values (18 = 72px, 22 = 88px, 30 = 120px)
- `transitionDuration` — fast/normal/slow
- `transitionTimingFunction` — out-expo
- `fontSize` — display/heading/subheading/title/body/caption/micro

### Step 3: `components/ui/button.tsx` — Remove Vibe

- Remove `@vibe/core` import
- Pure Tailwind implementation
- Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Sizes: `sm` (h-8), `default` (h-9), `lg` (h-10), `icon` (h-9 w-9)
- States: hover → brighter/darker, active → `scale-[0.97]`, focus → ring
- Border radius: `rounded-md` (6px)

### Step 4: `components/ui/card.tsx` — Polish

- `rounded-lg` → `rounded-lg` maps to `--radius-lg` (12px)
- `shadow-sm` → softer card shadow
- Add interactive variant (optional hover lift)

### Step 5: `components/ui/dialog.tsx` — Replace CSS Variables

Replace:
- `var(--backdrop-color)` → `bg-black/40`
- `var(--primary-background-color)` → `bg-background`
- `var(--ui-border-color)` → `border-border`
- `var(--box-shadow-large)` → `shadow-xl`
- `var(--border-radius-medium)` → `rounded-lg`

### Step 6: `components/ui/sheet.tsx` — Replace CSS Variables

Replace:
- `var(--primary-background-color)` → `bg-background`
- `var(--box-shadow-large)` → `shadow-xl`
- `var(--backdrop-color)` → `bg-black/40`
- `var(--layout-border-color)` → `border-border`
- Padding: `p-6`
- Duration: 300ms

### Step 7: `components/ui/select.tsx` — Replace CSS Variables

Replace all:
- `var(--ui-border-color)` → `border-border`
- `var(--primary-background-color)` → `bg-popover`
- `var(--box-shadow-medium)` → `shadow-md`
- `var(--primary-selected-color)` → `bg-accent`
- `var(--primary-color)` → `text-accent-foreground`
- `var(--secondary-text-color)` → `text-muted-foreground`

### Step 8: `components/ui/popover.tsx` — Replace CSS Variables

Replace:
- `var(--ui-border-color)` → `border-border`
- `var(--primary-background-color)` → `bg-popover`
- `var(--box-shadow-medium)` → `shadow-md`

### Step 9: `components/ui/dropdown-menu.tsx` — Replace CSS Variables

Replace all:
- `var(--ui-border-color)` → `border-border`
- `var(--primary-background-color)` → `bg-popover`
- `var(--box-shadow-medium)` → `shadow-md`
- `var(--primary-selected-color)` → `bg-accent`
- `var(--primary-color)` → `text-accent-foreground`

### Step 10: `components/ui/badge.tsx` — Remove Vibe

- Remove `@vibe/core` Badge wrapper
- Smaller text (11px), softer colors
- Pill shape (`rounded-full`) or small chip (`rounded-sm`)

### Step 11: `components/ui/input.tsx` — Remove Vibe

- Remove `@vibe/core` TextField wrapper
- Pure Tailwind input
- Height: `h-9`, radius: `rounded-md` (6px)
- Proper focus ring

### Step 12: Page-Level Spacing Audit

Apply consistent spacing across all pages:

| Element | Current | Target |
|---|---|---|
| Page padding | `p-6` | `p-8` (32px) |
| Section spacing | `gap-4` | `gap-6` / `gap-8` |
| Toolbar padding | `px-6 py-3` | `px-8 py-3` |
| Toolbar gap | `gap-2` | `gap-3` |
| List row height | `h-10` | `h-12` |

### Step 13: Dashboard Polish

- Increase section spacing
- Larger KPI cards with 12px radius
- Remove chart grid lines, softer axis colors
- Card headers with clear hierarchy

### Step 14: Task Dialog Polish

- Better field spacing (`space-y-4`)
- Metadata sidebar with tighter spacing
- Clearer typography hierarchy
- Softer separators

---

## Files to Modify (in order)

| # | File | Change |
|---|---|---|
| 1 | `app/globals.css` | New design tokens, animations, spacing system |
| 2 | `tailwind.config.ts` | Extended radius, shadow, spacing, font tokens |
| 3 | `components/ui/button.tsx` | Remove Vibe, pure Tailwind |
| 4 | `components/ui/card.tsx` | 12px radius, softer shadow |
| 5 | `components/ui/dialog.tsx` | Remove Vibe refs, 12px radius |
| 6 | `components/ui/sheet.tsx` | Remove Vibe refs, smoother animations |
| 7 | `components/ui/select.tsx` | Replace all Vibe variables |
| 8 | `components/ui/popover.tsx` | Replace all Vibe variables |
| 9 | `components/ui/dropdown-menu.tsx` | Replace all Vibe variables |
| 10 | `components/ui/badge.tsx` | Remove Vibe, smaller text |
| 11 | `components/ui/input.tsx` | Remove Vibe, pure Tailwind |
| 12 | Dashboard page | Spacing + polish pass |
| 13 | Task Dialog | Spacing + hierarchy pass |
| 14 | All other pages | Spacing consistency pass |

---

## Success Criteria

After implementation, Theta should feel:

- [ ] More premium — cards have 12px radius, subtle shadows, premium feel
- [ ] More spacious — consistent 8px grid, generous page padding
- [ ] More modern — smooth 150ms transitions, scale-on-press interactions
- [ ] More elegant — lower-contrast borders, intentional whitespace
- [ ] Easier to scan — clear typographic hierarchy, from 32px display to 11px micro
- [ ] Less visually noisy — neutral surfaces dominate, color has purpose
- [ ] More consistent — one design language across all 14+ views
- [ ] Comparable in polish to Linear, Apple, and modern SaaS

## Estimated Impact

- **14 files modified**
- **0 new files**
- **~600 lines changed total**
- **Zero feature changes** — purely design refinement
- **Zero TypeScript errors expected** — same interfaces, same props