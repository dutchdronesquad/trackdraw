# Base UI to Radix UI Migration PVA

Date: April 29, 2026

Status: completed

Completion note: TrackDraw no longer depends on `@base-ui/react`. The UI primitives now use Radix UI/shadcn-compatible implementations, with app-specific visual polish kept outside `src/components/ui/*` where practical. Run the normal release smoke test on desktop and mobile before shipping, especially Account dialog select/dropdown behavior, sidebar/dialog overlays, inspector controls, share/export, and canvas context menus.

## Decision Summary

Recommended decision:

- replace `@base-ui/react` with Radix UI primitives across all UI components
- migrate component-by-component, starting with the components broken on mobile
- treat `select`, `dropdown-menu`, and `dialog` as the critical path
- keep the exported API of each component identical so call sites require no changes
- remove `@base-ui/react` from the dependency tree once all components are migrated

The immediate trigger is that Base UI's `Select` and `Menu` primitives fail to respond to touch events when rendered inside a dialog on mobile. Every workaround attempted — native `<select>`, `DropdownMenuRadioGroup` — hits the same root cause: Base UI pointer-event handling conflicts with the dialog's focus trap on mobile browsers. Radix UI is the standard shadcn primitive layer, battle-tested on mobile, and what the shadcn component registry targets.

## Approval Recommendation

TrackDraw should approve this migration if the team accepts:

- migration is done component-by-component, not as a single rewrite
- the exported API of each component stays identical so call sites require no changes
- `button`, `input`, `separator`, `breadcrumb`, and `sidebar` are lower priority because they use Base UI utilities rather than interactive primitives, and have no known mobile issues
- `@base-ui/react` is kept in `package.json` until all components are migrated, then removed in a final cleanup commit

TrackDraw should not approve this migration yet if:

- the team prefers to wait for Base UI to reach a stable release and fix mobile touch handling
- there is a specific Base UI feature in use that has no Radix UI equivalent

## Go / No-Go Criteria

Go for implementation if:

- the mobile touch bug in the Account dialog is accepted as a blocking issue
- the team accepts a component-by-component migration with no call-site changes
- Radix UI packages are confirmed compatible with the Cloudflare/Next.js runtime used in this project

No-go or keep in planning if:

- the team prefers a Base UI fix or workaround for only the affected components
- a future shadcn update is expected to switch back to a different primitive layer

## Codebase Anchor

### Components Using Base UI Primitives (Interactive)

These use Base UI primitive components and have known or likely mobile touch issues:

- [src/components/ui/select.tsx](../../src/components/ui/select.tsx) — `@base-ui/react/select`. Broken on mobile inside dialogs. **Highest priority.**
- [src/components/ui/dropdown-menu.tsx](../../src/components/ui/dropdown-menu.tsx) — `@base-ui/react/menu`. Same pointer-event risk inside dialogs on mobile.
- [src/components/ui/dialog.tsx](../../src/components/ui/dialog.tsx) — `@base-ui/react/dialog`. Foundation for `AccountDialog` and other modals.
- [src/components/ui/sheet.tsx](../../src/components/ui/sheet.tsx) — `@base-ui/react/dialog`. Shares the dialog primitive and its mobile behavior.
- [src/components/ui/popover.tsx](../../src/components/ui/popover.tsx) — `@base-ui/react/popover`.
- [src/components/ui/context-menu.tsx](../../src/components/ui/context-menu.tsx) — `@base-ui/react/menu`.
- [src/components/ui/collapsible.tsx](../../src/components/ui/collapsible.tsx) — `@base-ui/react/collapsible`.
- [src/components/ui/scroll-area.tsx](../../src/components/ui/scroll-area.tsx) — `@base-ui/react/scroll-area`.
- [src/components/ui/tabs.tsx](../../src/components/ui/tabs.tsx) — `@base-ui/react/tabs`.
- [src/components/ui/tooltip.tsx](../../src/components/ui/tooltip.tsx) — `@base-ui/react/tooltip`.
- [src/components/ui/slider.tsx](../../src/components/ui/slider.tsx) — `@base-ui/react/slider`.
- [src/components/ui/avatar.tsx](../../src/components/ui/avatar.tsx) — `@base-ui/react/avatar`.

### Components Using Base UI Utilities Only (Lower Priority)

These use `mergeProps`, `useRender`, or thin primitive wrappers with no interactive behavior. No known mobile issues:

- [src/components/ui/button.tsx](../../src/components/ui/button.tsx) — `@base-ui/react/button`. Can switch to a plain `<button>` wrapper.
- [src/components/ui/input.tsx](../../src/components/ui/input.tsx) — `@base-ui/react/input`. Can switch to a plain `<input>` wrapper.
- [src/components/ui/separator.tsx](../../src/components/ui/separator.tsx) — `@base-ui/react/separator`. Can use `@radix-ui/react-separator` or a plain `<div>`.
- [src/components/ui/breadcrumb.tsx](../../src/components/ui/breadcrumb.tsx) — uses `mergeProps` utility only. Plain HTML after migration.
- [src/components/ui/sidebar.tsx](../../src/components/ui/sidebar.tsx) — uses `mergeProps` and `useRender` utilities. Plain HTML or custom hook after migration.

### Key Call Sites

These are the most widely used or most sensitive components that consume the UI primitives:

- [src/components/dialogs/AccountDialog/](../../src/components/dialogs/AccountDialog/) — uses `Select`, `Dialog`, `DropdownMenu`
- [src/components/inspector/](../../src/components/inspector/) — uses `Slider`, `Tabs`, `Popover`, `Tooltip`
- [src/components/editor/](../../src/components/editor/) — uses `ContextMenu`, `Tooltip`, `Sheet`, `Popover`
- [src/components/ui/sidebar.tsx](../../src/components/ui/sidebar.tsx) — uses `Sheet`, `Tooltip`, `Collapsible`

## Technical Model

### Radix UI Package Mapping

| Component           | Radix UI package                                  |
| ------------------- | ------------------------------------------------- |
| `select.tsx`        | `@radix-ui/react-select`                          |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu`                   |
| `context-menu.tsx`  | `@radix-ui/react-context-menu`                    |
| `dialog.tsx`        | `@radix-ui/react-dialog`                          |
| `sheet.tsx`         | `@radix-ui/react-dialog` (same package as dialog) |
| `popover.tsx`       | `@radix-ui/react-popover`                         |
| `collapsible.tsx`   | `@radix-ui/react-collapsible`                     |
| `scroll-area.tsx`   | `@radix-ui/react-scroll-area`                     |
| `tabs.tsx`          | `@radix-ui/react-tabs`                            |
| `tooltip.tsx`       | `@radix-ui/react-tooltip`                         |
| `slider.tsx`        | `@radix-ui/react-slider`                          |
| `avatar.tsx`        | `@radix-ui/react-avatar`                          |
| `separator.tsx`     | `@radix-ui/react-separator`                       |

### Migration Approach

For each component:

1. install the Radix UI package
2. replace Base UI imports with Radix UI imports in `src/components/ui/`
3. update internal render patterns to match Radix UI conventions, using shadcn's Radix UI-based component source as the baseline reference
4. keep all exported names and TypeScript props identical — no call-site changes
5. run `npm run lint` and `npm run type`
6. verify the component works in mobile Chrome and Safari before proceeding

### Known API Differences to Watch

- Base UI uses `data-open` / `data-closed` state attributes; Radix UI uses `data-[state=open]` / `data-[state=closed]`. Tailwind variants in component classnames need updating.
- Base UI `SelectContent` had `alignItemWithTrigger` for positioning. Radix UI uses `position="item-aligned"` on `SelectContent`.
- Base UI `Positioner`/`Popup` pattern (used in select, popover, tooltip, dropdown) maps to Radix UI's `Content` component with built-in positioning.
- Base UI `MenuPrimitive.RadioGroup` / `RadioItem` / `CheckboxItem` map directly to Radix UI equivalents with the same concept but different import paths.
- Base UI `ScrollUpArrow` / `ScrollDownArrow` in select map to Radix UI `SelectScrollUpButton` / `SelectScrollDownButton`.

## Phase Plan

### Phase 1: Select and Dropdown Menu

**Goal:** fix the mobile touch bug in the Account dialog expiry select.

**Packages to install:**

```bash
npm install @radix-ui/react-select @radix-ui/react-dropdown-menu
```

**Checklist:**

- [x] install `@radix-ui/react-select`
- [x] rewrite [src/components/ui/select.tsx](../../src/components/ui/select.tsx) using Radix UI, using the shadcn Radix UI `select` component as the baseline
- [x] verify `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` are all exported with identical signatures
- [x] update `data-open`/`data-closed` class variants to `data-[state=open]`/`data-[state=closed]` in select classnames
- [x] replace `alignItemWithTrigger` with `position="item-aligned"` on `SelectContent` where used
- [x] install `@radix-ui/react-dropdown-menu`
- [x] rewrite [src/components/ui/dropdown-menu.tsx](../../src/components/ui/dropdown-menu.tsx) using Radix UI
- [x] verify all exports are identical: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuPortal`
- [x] update `data-open`/`data-closed` class variants in dropdown-menu classnames
- [x] remove `isMobile` select branching from [src/components/dialogs/AccountDialog/ApiKeysView.tsx](../../src/components/dialogs/AccountDialog/ApiKeysView.tsx) and use a single `Select` for all screen sizes
- [x] remove the intermediate `DropdownMenu`-based select workaround from ApiKeysView
- [x] run `npm run lint` — passes
- [x] run `npm run type` — passes
- [ ] verify expiry `Select` opens and allows item selection on mobile Chrome
- [ ] verify expiry `Select` opens and allows item selection on mobile Safari
- [ ] verify expiry `Select` works on desktop

---

### Phase 2: Dialog and Sheet

**Goal:** migrate the dialog layer that hosts the mobile-broken components, so the Radix UI focus trap is consistent throughout.

**Packages to install:**

```bash
npm install @radix-ui/react-dialog
```

**Checklist:**

- [x] install `@radix-ui/react-dialog`
- [x] rewrite [src/components/ui/dialog.tsx](../../src/components/ui/dialog.tsx) using Radix UI
- [x] verify all exports are identical: `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`
- [x] update `data-open`/`data-closed` class variants in dialog classnames
- [x] rewrite [src/components/ui/sheet.tsx](../../src/components/ui/sheet.tsx) using Radix UI (`@radix-ui/react-dialog`)
- [x] verify all sheet exports are identical: `Sheet`, `SheetTrigger`, `SheetPortal`, `SheetOverlay`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`
- [x] update `data-open`/`data-closed` class variants in sheet classnames
- [x] run `npm run lint` — passes
- [x] run `npm run type` — passes
- [ ] verify `AccountDialog` opens, closes, and all tabs work on desktop
- [ ] verify `AccountDialog` opens, closes, and all tabs work on mobile
- [ ] verify sidebar sheet (`Sheet`) opens and closes on desktop
- [ ] verify sidebar sheet opens and closes on mobile
- [ ] verify no overlay/backdrop stacking issues when dialog contains a `Select` or `DropdownMenu`

---

### Phase 3: Popover, Tooltip, Context Menu

**Goal:** migrate the remaining overlay primitives used in the editor and inspector.

**Packages to install:**

```bash
npm install @radix-ui/react-popover @radix-ui/react-tooltip @radix-ui/react-context-menu
```

**Checklist:**

- [x] install `@radix-ui/react-popover`
- [x] rewrite [src/components/ui/popover.tsx](../../src/components/ui/popover.tsx) using Radix UI
- [x] verify all exports are identical: `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`
- [x] update `data-open`/`data-closed` class variants in popover classnames
- [x] install `@radix-ui/react-tooltip`
- [x] rewrite [src/components/ui/tooltip.tsx](../../src/components/ui/tooltip.tsx) using Radix UI
- [x] verify all exports are identical: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`
- [x] update `data-open`/`data-closed` class variants in tooltip classnames
- [x] install `@radix-ui/react-context-menu`
- [x] rewrite [src/components/ui/context-menu.tsx](../../src/components/ui/context-menu.tsx) using Radix UI
- [x] verify all exports are identical: `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuGroup`, `ContextMenuLabel`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent`
- [x] update `data-open`/`data-closed` class variants in context-menu classnames
- [x] run `npm run lint` — passes
- [x] run `npm run type` — passes
- [ ] verify inspector popovers open and close correctly
- [ ] verify tooltips appear on hover in the editor toolbar
- [ ] verify editor canvas context menu opens on right-click (desktop) and long-press (mobile)

---

### Phase 4: Collapsible, Tabs, Scroll Area, Slider, Avatar

**Goal:** migrate the remaining interactive primitives used in the inspector, sidebar, and layout.

**Packages to install:**

```bash
npm install @radix-ui/react-collapsible @radix-ui/react-tabs @radix-ui/react-scroll-area @radix-ui/react-slider @radix-ui/react-avatar
```

**Checklist:**

- [x] install `@radix-ui/react-collapsible`
- [x] rewrite [src/components/ui/collapsible.tsx](../../src/components/ui/collapsible.tsx) using Radix UI
- [x] verify exports are identical: `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`
- [x] install `@radix-ui/react-tabs`
- [x] rewrite [src/components/ui/tabs.tsx](../../src/components/ui/tabs.tsx) using Radix UI
- [x] verify exports are identical: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- [x] update `data-active`/state variants in tabs classnames to match Radix UI (`data-[state=active]`)
- [x] install `@radix-ui/react-scroll-area`
- [x] rewrite [src/components/ui/scroll-area.tsx](../../src/components/ui/scroll-area.tsx) using Radix UI
- [x] verify exports are identical: `ScrollArea`, `ScrollBar`
- [x] install `@radix-ui/react-slider`
- [x] rewrite [src/components/ui/slider.tsx](../../src/components/ui/slider.tsx) using Radix UI
- [x] verify exports are identical: `Slider`
- [x] install `@radix-ui/react-avatar`
- [x] rewrite [src/components/ui/avatar.tsx](../../src/components/ui/avatar.tsx) using Radix UI
- [x] verify exports are identical: `Avatar`, `AvatarImage`, `AvatarFallback`
- [x] run `npm run lint` — passes
- [x] run `npm run type` — passes
- [ ] verify inspector tabs switch correctly
- [ ] verify inspector sliders (e.g. opacity, width) respond to drag on desktop
- [ ] verify inspector sliders respond to touch on mobile
- [ ] verify sidebar collapsible groups open and close
- [ ] verify account avatar renders in the sidebar

---

### Phase 5: Utility-Only Components

**Goal:** remove remaining Base UI utility imports from components that do not need a Radix UI replacement.

**Packages to install:**

```bash
npm install @radix-ui/react-separator
```

**Checklist:**

- [x] rewrite [src/components/ui/button.tsx](../../src/components/ui/button.tsx) using a plain `<button>` element, preserving the `variant`, `size`, and `asChild` prop API
- [x] rewrite [src/components/ui/input.tsx](../../src/components/ui/input.tsx) using a plain `<input>` element, preserving the component API
- [x] install `@radix-ui/react-separator` and rewrite [src/components/ui/separator.tsx](../../src/components/ui/separator.tsx), or switch to a plain `<div>` with `role="separator"`
- [x] remove `mergeProps` import from [src/components/ui/breadcrumb.tsx](../../src/components/ui/breadcrumb.tsx) and replace with standard React prop spreading
- [x] remove `mergeProps` and `useRender` imports from [src/components/ui/sidebar.tsx](../../src/components/ui/sidebar.tsx) and replace with standard React patterns
- [x] run `npm run lint` — passes
- [x] run `npm run type` — passes
- [ ] verify buttons render and are clickable in editor toolbar, dialogs, and inspector
- [ ] verify inputs accept keyboard input in `AccountDialog` and inspector fields
- [ ] verify separators render correctly in menus and layout

---

### Phase 6: Cleanup

**Goal:** confirm no remaining Base UI dependency and remove it entirely.

**Checklist:**

- [x] run `grep -r "@base-ui/react" src/` — returns no results
- [x] run `grep -r "@base-ui/react" src/components/` — returns no results
- [x] remove `@base-ui/react` from `package.json`
- [x] run `npm install` to update `package-lock.json`
- [x] run `npm run lint` — passes
- [x] run `npm run type` — passes
- [ ] run a full manual smoke test:
  - [ ] editor loads and canvas renders
  - [ ] inspector panels open and all controls respond
  - [ ] sidebar navigation works
  - [ ] Account dialog opens, all tabs accessible, API key creation works on mobile
  - [ ] context menu opens on canvas right-click
  - [ ] gallery page loads and share/revoke actions work
- [x] confirm `@base-ui/react` does not appear in the final bundle (check build output or lock file)

---

## Validation Expectations

Before each phase is considered done:

- `npm run lint` passes
- `npm run type` passes
- affected components render and interact correctly on desktop
- affected components render and interact correctly on mobile Chrome and Safari
- no call-site file changes are required

Before removing `@base-ui/react`:

- `grep -r "@base-ui/react" src/` returns no results

## Risks

- **Data attribute naming:** Base UI uses `data-open`/`data-closed`; Radix UI uses `data-[state=open]`/`data-[state=closed]`. Every component's Tailwind classnames need auditing. Missed attributes cause invisible styling regressions.
- **Dialog regressions:** `dialog.tsx` is used across the whole app. A focus trap or overlay regression there affects everything. Test thoroughly before moving to phase 3.
- **Slider in editor:** `slider.tsx` is used in the inspector for design properties. A drag-handling regression on desktop or mobile directly affects core editor UX.
- **`asChild` pattern:** Radix UI uses `asChild` for polymorphic rendering. If Base UI used a different pattern, call sites that rely on composition may need checking even if the prop API is preserved.
- **`Sheet` and `Sidebar`:** the sidebar component wraps `Sheet` and has its own Base UI utility usage. Both need to be correct at the same time or the sidebar breaks.
- **Bundle size:** adding individual Radix UI packages is additive until `@base-ui/react` is removed in phase 6. During migration the bundle will temporarily include both.

## Recommended Next Step

The migration implementation is complete. Before release, run the standard desktop/mobile smoke test for `/studio`, dialogs, sidebar, inspector controls, context menus, share/export, dashboard tables, and read-only shared views.
