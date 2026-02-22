# Design System: NEVHA (Report a Concern)
**Project ID:** 8716852853535319365

## 1. Visual Theme & Atmosphere
The design presents a **"Modern, Clean Utility"** aesthetic with a focus on clarity and trustworthiness. It leans heavily into **Apple/iOS design principles**: high-quality blur effects (`backend-blur`), rounded pill-like shapes, and distinct grouping of information in card-like containers. The atmosphere is professional yet accessible, suitable for a community management app.

## 2. Color Palette & Roles

*   **Primary Blue** (`#007AFF`): Used for key actions (buttons), active states, and highlights. This is the standard iOS system blue.
*   **Background Light** (`#F2F2F7`): The foundational background for the light theme, slightly off-white/grey to provide contrast for white cards.
*   **Card White** (`#FFFFFF`): Used for content containers (cards) in light mode.
*   **Background Dark** (`#000000`): Deep black background for dark mode (OLED friendly).
*   **Card Dark** (`#1C1C1E`): Dark grey for content containers in dark mode.
*   **Wallet Gradient** (Linear `#1e293b` to `#0f172a`): A deep slate/navy gradient used for the "Outstanding Balance" feature card, giving it a premium, credit-card-like fee.
*   **Status Colors**:
    *   **Emerald** (`text-emerald-500`): For positive values (Payments, "Paid").
    *   **Amber** (`text-amber-500`): For warnings or upcoming dates ("Next Due Date").
    *   **Red** (`text-red-500`): For charges/bills ("Billed").

## 3. Typography Rules
*   **Font Family**: `Inter` (sans-serif). Clean, legible, and ubiquitous.
*   **Headings**: Bold weights (`font-bold`). Large titles (`text-[34px]`) for page headers.
*   **Body**: Regular weights for standard text (`text-sm`, `text-[15px]`).
*   **Labels/Captions**: Uppercase, small, tracking-wide (`uppercase tracking-wider text-[10px]`) for data labels like "HOMEOWNER ACCOUNT".

## 4. Component Stylings

*   **Cards (Apple Style)**:
    *   **Shape**: Generously rounded corners (`rounded-2xl` or `rounded-xl`).
    *   **Shadow**: "Apple Card Shadow" - soft, diffused drop shadow (`0 10px 30px -5px rgba(0,0,0,0.1)`).
    *   **Background**: White (Light) / Dark Grey (Dark).

*   **Buttons**:
    *   **Primary/Action**: Pill-shaped (`rounded-full`). White text on black/background (or vice-versa in context). High contrast.
    *   **Activity**: `active:scale-95` transform for tactile feedback.

*   **Navigation Bar**:
    *   **Style**: Fixed bottom, glassmorphic (`backdrop-filter: blur(20px)`), translucent background (`bg-white/80`).
    *   **Icons**: Material Symbols Outlined. Stacked vertically with small text labels.

*   **Glassmorphism**:
    *   Used in sticky headers and navigation. `ios-blur` utility class.

## 5. Layout Principles
*   **Mobile-First**: Designed for a narrow viewport (max-width `430px`), typical of mobile apps.
*   **Padding**: Consistent `px-5` or `px-6` horizontal padding.
*   **Spacing**: Grid layouts (`grid-cols-2 gap-3`) for metrics. Vertical lists for history.
*   **Whitespace**: Ample whitespace between sections (`mb-10`) to reduce cognitive load.
