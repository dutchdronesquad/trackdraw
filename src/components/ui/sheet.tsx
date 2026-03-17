import * as React from 'react'
import { cn } from '@/lib/utils'

interface SheetContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | undefined>(undefined)

export function useSheet() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error('Sheet components must be used within <Sheet>')
  return ctx
}

export function Sheet({
  children, open, onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false)
  const isControlled = open !== undefined
  const value = React.useMemo<SheetContextValue>(
    () => ({
      open: isControlled ? !!open : uncontrolled,
      setOpen: (v) => (isControlled ? onOpenChange?.(v) : setUncontrolled(v)),
    }),
    [isControlled, open, uncontrolled, onOpenChange]
  )
  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
}

export function SheetTrigger({ children }: { children: React.ReactElement<Record<string, unknown>> }) {
  const { setOpen } = useSheet()
  const originalOnClick = children.props.onClick as ((e: React.MouseEvent) => void) | undefined
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      originalOnClick?.(e)
      setOpen(true)
    },
  })
}

export function SheetContent({
  children,
  side = 'left',
  className,
}: {
  children: React.ReactNode
  side?: 'left' | 'right' | 'bottom'
  className?: string
}) {
  const { open, setOpen } = useSheet()

  return (
    <div
      className={cn('fixed inset-0 z-50 flex', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative flex flex-col bg-sidebar border-border shadow-xl transition-all duration-200 ease-in-out',
          side === 'left'   && 'h-full w-72 border-r',
          side === 'right'  && 'h-full w-72 border-l ml-auto',
          side === 'bottom' && 'mt-auto w-full rounded-t-2xl border-t',
          side === 'left'   && (open ? 'translate-x-0' : '-translate-x-full'),
          side === 'right'  && (open ? 'translate-x-0' : 'translate-x-full'),
          side === 'bottom' && (open ? 'translate-y-0' : 'translate-y-full'),
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-border px-4 py-3 shrink-0', className)}>
      {children}
    </div>
  )
}

export function SheetTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-xs font-semibold uppercase tracking-widest text-muted-foreground', className)}>
      {children}
    </h2>
  )
}

export function SheetClose({ children }: { children: React.ReactElement<Record<string, unknown>> }) {
  const { setOpen } = useSheet()
  const originalOnClick = children.props.onClick as ((e: React.MouseEvent) => void) | undefined
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      originalOnClick?.(e)
      setOpen(false)
    },
  })
}
