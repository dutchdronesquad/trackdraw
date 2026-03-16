"use client";
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from './ui/button'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(false)
  useEffect(()=>{ setMounted(true); setDark(document.documentElement.classList.contains('dark')) },[])
  const toggle = () => {
    const root = document.documentElement
    const isDark = root.classList.toggle('dark')
    setDark(isDark)
    try { localStorage.setItem('trackdraw.theme', isDark ? 'dark':'light') } catch {}
  }
  useEffect(()=>{
    try {
      const pref = localStorage.getItem('trackdraw.theme')
      if(pref){
        document.documentElement.classList.toggle('dark', pref==='dark')
        setDark(pref==='dark')
      }
    } catch {}
  },[])
  if(!mounted) return null
  return (
    <Button type="button" variant="secondary" size="icon" onClick={toggle} aria-label="Toggle theme">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
