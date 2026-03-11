Using Node.js 20, Tailwind CSS v3.4.19, and Vite v7.2.4

Tailwind CSS has been set up with the shadcn theme

Setup complete: /mnt/okcomputer/output/app

Components (40+):
  accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb,
  button-group, button, calendar, card, carousel, chart, checkbox, collapsible,
  command, context-menu, dialog, drawer, dropdown-menu, empty, field, form,
  hover-card, input-group, input-otp, input, item, kbd, label, menubar,
  navigation-menu, pagination, popover, progress, radio-group, resizable,
  scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner,
  spinner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

Usage:
  import { Button } from '@/components/ui/button'
  import { Card, CardHeader, CardTitle } from '@/components/ui/card'

Current structure in this repo:
  app/src/             React + Vite source
  app/src/hooks/       Custom hooks
  app/src/components/ui/   Shadcn components (actualizados cuando corresponde)
  app/src/App.tsx      Root React component
  app/src/index.css    Global styles
  app/src/main.tsx     Entry point for rendering the app
  app/index.html       Entry point
  app/tailwind.config.js  Tailwind theme, plugins
  app/vite.config.ts   Build/development config
  app/postcss.config.js  CSS tooling config
