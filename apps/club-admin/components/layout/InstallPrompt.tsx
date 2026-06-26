'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('SW registration failed: ', err)
        })
      })
    }

    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIosDevice)

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const dismissed = localStorage.getItem('pwa-prompt-dismissed')
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setIsVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS doesn't have beforeinstallprompt, so we simulate it
    if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches && !(navigator as any).standalone) {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed')
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setIsVisible(true), 2000)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        alert('To install: tap the Share button at the bottom of Safari, then select "Add to Home Screen".')
      }
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsVisible(false)
    }
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    setIsVisible(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 flex justify-center pointer-events-none animate-in slide-in-from-bottom-5 duration-500 fade-in">
      <div className="bg-[#A3E635] text-black px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-4 max-w-sm w-full pointer-events-auto border border-black/10">
        <div className="bg-black/10 p-2.5 rounded-xl flex-shrink-0">
          <Download size={18} className="text-black" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-black">Install App</p>
          <p className="text-[0.7rem] text-black/80 font-medium mt-0.5">
            {isIOS ? 'Tap Share \u2192 Add to Home Screen' : 'Add to your home screen'}
          </p>
        </div>
        {!isIOS && (
          <button 
            onClick={handleInstall}
            className="bg-black text-[#A3E635] text-xs font-bold px-4.5 py-2 rounded-xl hover:bg-black/80 transition-colors"
          >
            Install
          </button>
        )}
        <button 
          onClick={dismiss}
          className="text-black/60 hover:text-black p-1 flex-shrink-0 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
