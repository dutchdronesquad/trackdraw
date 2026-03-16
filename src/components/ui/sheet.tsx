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

export function Sheet({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [uncontrolled, setUncontrolled] = React.useState(false)
  const isControlled = open !== undefined
  const value = React.useMemo<SheetContextValue>(
    () => ({ open: isControlled ? !!open : uncontrolled, setOpen: (v) => (isControlled ? onOpenChange?.(v) : setUncontrolled(v)) }),
    [isControlled, open, uncontrolled, onOpenChange]
  )
  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
}

export function SheetTrigger({ children }: { children: React.ReactElement<any> }) {
  const { setOpen } = useSheet()
  const originalOnClick = (children.props as any).onClick as ((e: React.MouseEvent)=>void) | undefined
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      originalOnClick?.(e)
      setOpen(true)
    },
  })
}

export function SheetContent({ children, side = 'left', className }: { children: React.ReactNode; side?: 'left' | 'right' | 'bottom'; className?: string }) {
  const { open, setOpen } = useSheet()
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      <div
        className={cn('absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity', open ? 'opacity-100' : 'opacity-0')}
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          'relative flex h-full w-80 flex-col border bg-white shadow-xl transition-all duration-200',
          side === 'left' && (open ? 'translate-x-0' : '-translate-x-full'),
          side === 'right' && (open ? 'translate-x-0 ml-auto' : 'translate-x-full ml-auto'),
          side === 'bottom' && 'mt-auto w-full h-[75vh] rounded-t-xl',
          side === 'bottom' && (open ? 'translate-y-0 animate-sheet-in' : 'translate-y-full animate-sheet-out'),
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-start justify-between gap-4 border-b px-4 py-3', className)}>{children}</div>
}

export function SheetTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-sm font-semibold tracking-wide uppercase text-slate-500', className)}>{children}</h2>
}

export function SheetClose({ children }: { children: React.ReactElement<any> }) {
  const { setOpen } = useSheet()
  const originalOnClick = (children.props as any).onClick as ((e: React.MouseEvent)=>void) | undefined
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      originalOnClick?.(e)
      setOpen(false)
    },
  })
}
