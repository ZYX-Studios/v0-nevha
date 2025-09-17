# NEVHA Design System
*Northfields Executive Village Homeowners Association*

## Overview
This design system establishes consistent visual and interaction patterns for the NEVHA community portal, optimized for homeowners of all ages with emphasis on accessibility, readability, and community warmth.

## Design Philosophy
- **Accessibility First**: Large touch targets, high contrast, readable text sizes
- **Community Focused**: Warm, welcoming, and trustworthy visual language
- **Age Inclusive**: Designed for both young and older homeowners
- **Mobile Optimized**: Compact, efficient use of space while maintaining usability

---

## Color Palette

### Primary Colors
```css
/* Blue Palette - Trust & Community */
--primary-blue-50: #eff6ff
--primary-blue-100: #dbeafe
--primary-blue-200: #bfdbfe
--primary-blue-500: #3b82f6
--primary-blue-600: #2563eb
--primary-blue-700: #1d4ed8

/* Neutral Palette - Clean & Professional */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151
--gray-900: #111827
--white: #ffffff
```

### Accent Colors
```css
/* Status & Action Colors */
--orange-400: #fb923c  /* Reports/Concerns */
--orange-500: #f97316
--red-500: #ef4444    /* Emergency/High Priority */
--red-600: #dc2626
--green-500: #22c55e  /* Success states */
```

### Background System
```css
/* Page Backgrounds */
--bg-primary: linear-gradient(to bottom right, #eff6ff, #ffffff, #eff6ff)
--bg-card: #ffffff
--bg-header: rgba(255, 255, 255, 0.95)
--bg-nav: rgba(255, 255, 255, 0.95)
```

---

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

### Type Scale
```css
/* Headers */
--text-3xl: 1.875rem    /* 30px - Page titles */
--text-2xl: 1.5rem      /* 24px - Section headers */
--text-xl: 1.25rem      /* 20px - Card titles */
--text-lg: 1.125rem     /* 18px - Subsection headers */

/* Body Text */
--text-base: 1rem       /* 16px - Primary body text */
--text-sm: 0.875rem     /* 14px - Secondary text */
--text-xs: 0.75rem      /* 12px - Captions, labels */

/* Font Weights */
--font-bold: 700        /* Headers, important text */
--font-semibold: 600    /* Subheaders */
--font-medium: 500      /* Navigation, buttons */
--font-normal: 400      /* Body text */
```

### Typography Usage
- **Page Titles**: `text-2xl font-bold text-gray-900`
- **Section Headers**: `text-lg font-bold text-gray-900`
- **Card Titles**: `text-base font-bold text-gray-900`
- **Body Text**: `text-sm text-gray-700`
- **Secondary Text**: `text-xs text-gray-600`
- **Labels**: `text-xs text-gray-500`

---

## Spacing System

### Padding Scale
```css
/* Component Padding */
--p-1: 0.25rem   /* 4px */
--p-2: 0.5rem    /* 8px */
--p-3: 0.75rem   /* 12px */
--p-4: 1rem      /* 16px - Standard card padding */
--p-6: 1.5rem    /* 24px - Large card padding */

/* Layout Padding */
--px-4: 1rem     /* 16px - Page horizontal padding */
--py-4: 1rem     /* 16px - Page vertical padding */
```

### Margin Scale
```css
/* Component Margins */
--mb-1: 0.25rem  /* 4px */
--mb-2: 0.5rem   /* 8px */
--mb-3: 0.75rem  /* 12px - Standard section spacing */
--mb-4: 1rem     /* 16px - Large section spacing */
--mb-6: 1.5rem   /* 24px - Major section spacing */

/* Grid Gaps */
--gap-3: 0.75rem /* 12px - Standard grid gap */
--gap-4: 1rem    /* 16px - Large grid gap */
```

---

## Component Patterns

### Header Pattern
```tsx
<header className="px-4 py-4 bg-white/95 backdrop-blur-xl border-b border-blue-100 shadow-sm">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <Image src="/NEVHA logo.svg" alt="NEVHA Logo" width={40} height={40} className="w-10 h-10" />
      <div>
        <h1 className="text-lg font-bold text-gray-900">NEVHA</h1>
        <p className="text-xs text-blue-600 font-medium">Northfields Executive Village</p>
      </div>
    </div>
    <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500">
      <MapPin className="w-3 h-3" />
      <span>Portal</span>
    </div>
  </div>
</header>
```

### Card Pattern
```tsx
<Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
  <CardContent className="p-4">
    {/* Card content */}
  </CardContent>
</Card>
```

### Action Card Pattern
```tsx
<Link href="/path">
  <motion.div
    whileTap={{ scale: 0.98 }}
    className="bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-lg transition-all p-4 hover:bg-gray-50"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-base font-bold text-gray-900">Action Title</h4>
          <p className="text-xs text-gray-600">Action description</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </div>
  </motion.div>
</Link>
```

### Welcome Banner Pattern
```tsx
<Card className="rounded-xl border-0 shadow-md bg-gradient-to-r from-blue-600 to-blue-700 overflow-hidden">
  <CardContent className="p-4">
    <div className="flex items-center justify-between text-white">
      <div>
        <h2 className="text-xl font-bold mb-1">Welcome Message</h2>
        <p className="text-blue-100 text-sm">Subtitle text</p>
      </div>
      <Icon className="w-8 h-8 text-blue-200" />
    </div>
  </CardContent>
</Card>
```

---

## Icon System

### Icon Sizes
```css
/* Icon Scale */
--icon-xs: 12px    /* w-3 h-3 - Small indicators */
--icon-sm: 16px    /* w-4 h-4 - Navigation controls */
--icon-base: 20px  /* w-5 h-5 - Action buttons */
--icon-lg: 24px    /* w-6 h-6 - Large buttons */
--icon-xl: 32px    /* w-8 h-8 - Feature icons */
```

### Icon Colors by Context
- **Primary Actions**: `text-white` (on colored backgrounds)
- **Secondary Actions**: `text-gray-600`
- **Navigation**: `text-gray-400`
- **Status Indicators**: Context-specific colors

### Action Icon Colors
```css
/* Action-Specific Icon Backgrounds */
--icon-report: linear-gradient(to bottom right, #fb923c, #f97316)
--icon-emergency: linear-gradient(to bottom right, #ef4444, #dc2626)
--icon-application: linear-gradient(to bottom right, #3b82f6, #2563eb)
--icon-community: linear-gradient(to bottom right, #3b82f6, #1d4ed8)
```

---

## Layout Patterns

### Page Layout
```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 font-inter">
  {/* Safe Area Top */}
  <div className="h-safe-area-inset-top bg-transparent" />
  
  {/* Header */}
  <header>{/* Header content */}</header>
  
  {/* Main Content */}
  <div className="px-4 py-4">
    {/* Page content */}
  </div>
  
  {/* Bottom Navigation */}
  <nav>{/* Navigation content */}</nav>
  
  {/* Safe Area Bottom */}
  <div className="h-28" />
</div>
```

### Section Layout
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, delay: 0.2 }}
  className="mb-4"
>
  <div className="mb-3">
    <h3 className="text-lg font-bold text-gray-900 mb-1">Section Title</h3>
    <p className="text-sm text-gray-600">Section description</p>
  </div>
  
  {/* Section content */}
</motion.div>
```

---

## Navigation System

### Bottom Navigation Pattern
```tsx
<motion.nav
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, delay: 0.6 }}
  className="fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200"
>
  <div className="flex justify-around items-center py-4 px-2">
    {/* Navigation items */}
  </div>
</motion.nav>
```

### Navigation Item Pattern
```tsx
<Link href="/" className="flex flex-col items-center min-w-[70px] min-h-[70px] justify-center">
  <motion.div whileTap={{ scale: 0.95 }} className="flex flex-col items-center">
    <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <span className="text-gray-900 text-sm font-semibold">Label</span>
  </motion.div>
</Link>
```

---

## Animation Guidelines

### Motion Principles
- **Subtle & Purposeful**: Animations should enhance UX, not distract
- **Consistent Timing**: Use standard durations for similar interactions
- **Accessibility**: Respect `prefers-reduced-motion`

### Standard Animations
```tsx
/* Page Entry */
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8, delay: 0.2 }}

/* Button Interactions */
whileTap={{ scale: 0.98 }}

/* Loading States */
animate={{ rotate: 360 }}
transition={{ duration: 1, repeat: Infinity, ease: "linear" }}

/* Content Transitions */
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: -20 }}
transition={{ duration: 0.4, ease: "easeInOut" }}
```

---

## Accessibility Guidelines

### Touch Targets
- **Minimum Size**: 44px × 44px (w-11 h-11 or larger)
- **Navigation Items**: 56px × 56px (w-14 h-14)
- **Action Buttons**: 40px × 40px minimum (w-10 h-10)

### Color Contrast
- **Text on White**: Minimum 4.5:1 ratio
- **Text on Blue**: Use white text for sufficient contrast
- **Interactive Elements**: Clear visual feedback on hover/focus

### Text Readability
- **Minimum Body Text**: 14px (text-sm)
- **Minimum Touch Labels**: 12px (text-xs)
- **Line Height**: 1.5 for body text, 1.2 for headers

### Focus States
```css
/* Focus Ring */
.focus-visible:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

---

## Responsive Breakpoints

### Breakpoint System
```css
/* Mobile First Approach */
--sm: 640px   /* Small tablets */
--md: 768px   /* Tablets */
--lg: 1024px  /* Small desktops */
--xl: 1280px  /* Large desktops */
```

### Responsive Patterns
- **Mobile**: Single column, full-width cards
- **Tablet**: Two-column grids where appropriate
- **Desktop**: Multi-column layouts with max-width containers

---

## Implementation Checklist

### For Each New Page:
- [ ] Use standard page layout structure
- [ ] Include NEVHA header with logo and branding
- [ ] Apply consistent spacing (px-4 py-4)
- [ ] Use defined color palette
- [ ] Follow typography scale
- [ ] Include proper animations
- [ ] Test accessibility (contrast, touch targets)
- [ ] Ensure responsive behavior
- [ ] Add bottom navigation if needed

### Component Standards:
- [ ] Cards use rounded-xl with shadow-md
- [ ] Action items have hover states
- [ ] Icons follow size guidelines
- [ ] Text follows hierarchy
- [ ] Spacing follows system
- [ ] Colors match palette

---

## Brand Assets

### Logo Usage
- **File**: `/public/NEVHA logo.svg` (dark) or `/public/NEVHA logo-white.svg` (light)
- **Size**: 40×40px (w-10 h-10) in headers
- **Spacing**: 12px margin from text (space-x-3)

### Brand Text
- **Primary**: "NEVHA"
- **Secondary**: "Northfields Executive Village"
- **Tagline**: "Your Community Portal"

---

*Last Updated: September 17, 2025*
*Version: 1.0*
