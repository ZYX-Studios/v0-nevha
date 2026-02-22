# Components & Styling

The project uses a modern, component-first approach for UI development.

## Technology Stack
*   **Tailwind CSS**: Utility-first CSS framework for rapid styling.
*   **Shadcn UI**: Reusable component library built on Radix UI and Tailwind.
*   **Lucide React**: Icon library.
*   **Framer Motion** (if used): For complex animations.

## Theme Configuration
The application uses a **"Medical/Clean"** aesthetic, characterized by soft blues and neutral slates.
*   **Base Style**: New York (Shadcn preset).
*   **Base Color**: Neutral.
*   **Dark Mode**: Supported via `next-themes` and CSS variables.

### Color Palette
Defined in `app/globals.css`, the palette focuses on trust and cleanliness.
*   **Primary**: Soft Medical Blue range (`#0ea5e9` to `#0369a1`).
*   **Secondary**: Neutral Soft Grey (`slate-50` to `slate-900`).
*   **Background**: Very slight blue tint (`#f8fbff`) to reduce eye strain compared to pure white.

### Global Styles
Global CSS variables control the look and feel:
```css
:root {
  --radius: 1.5rem; /* Highly rounded, pill-like aesthetic */
  --primary: #3b82f6;
  --glass-bg: rgba(255, 255, 255, 0.7); /* Glassmorphism support */
}
```

## UI Components
Components are located in `components/ui` and are individual files that can be modified directly.
*   **Buttons**: Supports variants (default, destructive, outline, secondary, ghost, link).
*   **Inputs**: Standardized form elements with focus rings matching the primary color.
*   **Cards**: Used heavily for dashboards and content grouping.

## Custom Animations
The project includes custom keyframe animations in `globals.css` for a polished feel:
*   `animate-float`: Gentle vertical floating (6s duration).
*   `animate-float-delayed`: Offset floating for layered elements.
*   `animate-shimmer`: Loading state or highlight effect.
*   `animate-glow`: Pulsing opacity for attention-grabbing elements.

## Icons
Use **Lucide React** for all iconography.
```tsx
import { House, key } from "lucide-react"
```
