# Design Context: HOA PWA

This document defines our design tokens, motion guidelines, and component conventions so we can repeatedly achieve a premium, cohesive feel across pages.

## Foundations

- Palette (maps to CSS variables in `styles/globals.css`)
  - Primary: `--primary` / `--primary-foreground`
  - Secondary: `--secondary` / `--secondary-foreground`
  - Background / Foreground: `--background` / `--foreground`
  - Muted: `--muted` / `--muted-foreground`
  - Accent: `--accent` / `--accent-foreground`
  - Border / Input / Ring: `--border` / `--input` / `--ring`
  - Destructive: `--destructive` / `--destructive-foreground`

- Radius
  - Small: `var(--radius-sm)`
  - Medium: `var(--radius-md)`
  - Large: `var(--radius-lg)` (default)
  - Extra: `var(--radius-xl)` (hero/feature cards)

- Shadows
  - Card (default): subtle, soft shadow on `hover`
  - Elevated dialogs/cards: add a small Y-translation and shadow on `hover`

- Typography
  - Sans: Geist Sans (`--font-geist-sans`)
  - Mono: Geist Mono (`--font-geist-mono`) for codes like `ref_code`
  - Heading scale (clamp):
    - H1: clamp(2.25rem, 4vw, 3rem)
    - H2: clamp(1.75rem, 3vw, 2.25rem)
    - H3: clamp(1.375rem, 2.5vw, 1.75rem)

## Motion

Use motion to guide attention and create a premium feel, never to distract.

- Utilities (from `styles/globals.css`)
  - `.animate-fade-in` – 0.6s ease-out
  - `.animate-fade-in-up` – 0.6s ease-out, slight upward movement
  - `.animate-scale-in` – 0.4s ease-out, subtle pop-in
  - `.animate-slide-up` – 0.6s ease-out, larger upward movement

- Easing and duration
  - Default entrance: 0.6s ease-out
  - Small feedback (buttons, icons): 150–250ms, CSS transitions
  - Stagger sequences for lists where appropriate

- Triggers
  - On first paint for hero and headers
  - On in-viewport for long lists/sections (future: IntersectionObserver or Framer Motion)

## Layout Patterns

- Containers
  - Home hero: `max-w-4xl`
  - Content pages: `max-w-3xl` or `max-w-4xl`
  - Report form: `max-w-2xl` (compact mobile-first)

- Spacing
  - Section vertical: `py-12 md:py-16`
  - Grid gaps: `gap-4 md:gap-6`
  - Form stack spacing: `space-y-4 sm:space-y-6`

- Grids (mobile-first)
  - Two-up: `grid-cols-1 sm:grid-cols-2`
  - Three-up: `grid-cols-1 sm:grid-cols-3`

## Components

- Cards
  - Rounded: `rounded-2xl` for feature and form containers
  - Subtle glass: `bg-card/90` with `backdrop-blur-xl`
  - Gradient chrome: wrapper with `bg-gradient-to-b from-primary/30 via-primary/10 to-transparent` as a 1.5px outer border

- Buttons
  - Primary CTA: solid primary, shadow on hover
  - Secondary: outline with transparent background
  - Mobile: full-width in stacked layouts

- Inputs
  - Iconified inputs: left icon using absolute positioning and `pl-9`
  - Sections: label groups like “Your Details” / “Concern Details”

## Usage Examples

- Report form (`app/report/page.tsx`)
  - Combined rows (mobile-first):
    - `Block` + `Lot` + `Phase` in one row on sm+
    - `Street` + `Email` in one row on sm+
  - Motion on section headers, fields, and actions via `.animate-fade-in-up`

- Home (`app/page.tsx`)
  - Hero, section headers, and cards animate in using `.animate-fade-in-up`
  - Card hover: translate Y and shadow for premium micro-interactions

- Announcements (`app/announcements/page.tsx`)
  - Header/search/CTA and list items animate in
  - Compact container and spacing for mobile-first readability

## Accessibility

- Maintain contrast ratios (WCAG AA+) for text on cards and backgrounds.
- Never rely on color alone for status (use icons and labels).

## Next Steps

- Introduce Framer Motion for scroll-based stagger and finer motion choreography.
- Extract shared UI primitives into a small design system layer (e.g., `components/design/`): AnimatedSection, GlowCard, IconInput.
- Add a live theme preview page (`/design`) to visualize tokens and components for rapid iteration.
