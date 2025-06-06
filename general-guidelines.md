

---
trigger: glob
description: This rule explains Next.js conventions and best practices for fullstack development.
globs: **/*.js,**/*.jsx,**/*.ts,**/*.tsx
---

# Next.js rules

- Always check official documentation for the latest information when fixing issues and installing dependencies.
- Always check that a package you are installing is compatible with your version of Next.js.
- Use the App Router structure with `page.tsx` files in route directories.
- Client components must be explicitly marked with `'use client'` at the top of the file.
- Use kebab-case for directory names (e.g., `components/auth-form`) and PascalCase for component files.
- Prefer named exports over default exports, i.e. `export function Button() { /* ... */ }` instead of `export default function Button() { /* ... */ }`.
- Minimize `'use client'` directives:
  - Keep most components as React Server Components (RSC)
  - Only use client components when you need interactivity and wrap in `Suspense` with fallback UI
  - Create small client component wrappers around interactive elements
- Avoid unnecessary `useState` and `useEffect` when possible:
  - Use server components for data fetching
  - Use React Server Actions for form handling
  - Use URL search params for shareable state
- Use `nuqs` for URL search param state management

---
trigger: glob
description: This rule explains Tailwind CSS conventions and best practices for styling.
globs: **/*.js,**/*.jsx,**/*.ts,**/*.tsx
---

# Tailwind CSS rules

- Use Tailwind CSS for styling.
- Use the `tailwind.config.js` file for configuration.
- Use the `app/globals.css` file for global styles.
- Use the `components.json` file for component styles.
- Use the `components.json` file for component styles.

---
trigger: glob
description: This rule explains Shadcn UI conventions and best practices for component library.
globs: **/*.js,**/*.jsx,**/*.ts,**/*.tsx
---

# Shadcn UI rules

- Use Shadcn UI for components.
- Use the `components.json` file for component styles.
- Use the `components.json` file for component styles.
