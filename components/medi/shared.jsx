'use client'
import { motion } from 'framer-motion'
import { X, AlertCircle, CheckCircle2, Inbox, User, ArrowRight, Users, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { getPatientYearOfBirth } from '@/lib/patientDemographics'

export const StatusBadge = ({ status }) => {
  const map = {
    'Pending': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Pending Pickup': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'In Progress': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Completed': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Delivered': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Active': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Admitted': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Discharged': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    'Successful': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Complications': 'bg-red-500/15 text-red-400 border-red-500/30',
    'Ongoing': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Urgent': 'bg-red-500/15 text-red-400 border-red-500/30',
    'Normal': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  }
  const cls = map[status] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>{status}</span>
}

export const SectionHeader = ({ title, subtitle, actions }) => (
  <div className="flex items-end justify-between mb-6">
    <div>
      <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
)

export const EmptyState = ({ icon: Icon = Inbox, message = 'Nothing here yet' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
      <Icon className="w-7 h-7" />
    </div>
    <p className="text-sm">{message}</p>
  </div>
)

export const SkeletonLoader = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse bg-white/5 rounded ${className}`} />
)

export const SlideOverPanel = ({ open, onClose, title, children }) => {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative w-full max-w-md bg-[#0F1E36] border-l border-white/10 h-full overflow-y-auto">
        <div className="sticky top-0 bg-[#0F1E36] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  )
}

export const ConfirmModal = ({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm' }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-[#0F1E36] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center"><AlertCircle className="w-5 h-5" /></div>
          <div>
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{body}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
          <button onClick={() => { onConfirm?.(); onClose?.() }} className="px-4 py-2 rounded-lg bg-[#1D7FE8] hover:bg-[#1D7FE8]/90 text-sm font-medium">{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  )
}

export const PatientSummaryCard = ({ patient }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1D7FE8] to-[#10B981] flex items-center justify-center font-display font-bold text-lg">{patient.name?.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
      <div>
        <div className="font-display font-semibold">{patient.name}</div>
        <div className="text-xs text-slate-400 font-mono">ID: {patient.nationalId}</div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 text-center">
      <div className="bg-white/5 rounded-lg p-2"><div className="text-xs text-slate-400">Year of Birth</div><div className="font-display font-semibold">{getPatientYearOfBirth(patient) || 'N/A'}</div></div>
      <div className="bg-white/5 rounded-lg p-2"><div className="text-xs text-slate-400">Gender</div><div className="font-display font-semibold text-sm">{patient.gender}</div></div>
      <div className="bg-[#1D7FE8]/15 rounded-lg p-2"><div className="text-xs text-slate-400">Blood</div><div className="font-display font-semibold text-[#1D7FE8]">{patient.bloodType}</div></div>
      <div className="bg-white/5 rounded-lg p-2"><div className="text-xs text-slate-400">Weight</div><div className="font-display font-semibold">{patient.weight ? `${patient.weight} kg` : 'N/A'}</div></div>
      <div className="bg-white/5 rounded-lg p-2 col-span-2"><div className="text-xs text-slate-400">Height</div><div className="font-display font-semibold">{patient.height ? `${patient.height} cm` : 'N/A'}</div></div>
    </div>
  </div>
)

const logoSizeMap = {
  'w-8': 32,
  'h-8': 32,
  'w-11': 44,
  'h-11': 44,
  'w-14': 56,
  'h-14': 56,
}

export const BrandLogo = ({ className = 'w-8 h-8' }) => {
  const classes = className.split(/\s+/)
  const width = classes.map((item) => logoSizeMap[item]).find((value, index) => classes[index]?.startsWith('w-')) || 32
  const height = classes.map((item) => logoSizeMap[item]).find((value, index) => classes[index]?.startsWith('h-')) || width

  return (
    <div className={`${className} relative flex-shrink-0`} style={{ width, height }}>
      <Image
        src="/images/medico_logo_transparent.png"
        alt="Medico logo"
        fill
        sizes={`${width}px`}
        className="scale-[1.15] object-contain"
      />
    </div>
  )
}

export const DashboardShell = ({ role, roleColor = '#1D7FE8', icon: Icon, navItems = [], active, onNav, sidebarRecentPatients = [], children }) => {
  const [profileName, setProfileName] = useState('')

  useEffect(() => {
    let isActive = true

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isActive) setProfileName('')
        return
      }

      const fallbackName = user.displayName || user.email?.split('@')[0] || role

      try {
        const profileSnapshot = await getDocs(query(
          collection(db, 'website_users'),
          where('uid', '==', user.uid)
        ))
        const profile = profileSnapshot.docs[0]?.data()
        if (isActive) setProfileName(profile?.fullName?.trim() || fallbackName)
      } catch (error) {
        console.error('[Medico dashboard] Failed to load user profile', error)
        if (isActive) setProfileName(fallbackName)
      }
    })

    return () => {
      isActive = false
      unsubscribe()
    }
  }, [role])

  const handleSignOut = async () => {
    await signOut(auth)
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white flex">
      <aside className="medico-sidebar group fixed top-0 left-0 h-screen w-16 hover:w-60 transition-all duration-300 bg-[#0F1E36] border-r border-white/10 z-40 overflow-hidden [&>span]:hidden">
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <BrandLogo />
          <div className="ml-3 font-display font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Medico</div>
        </div>
        {navItems.length > 0 && (
          <nav className="p-2 space-y-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => onNav?.(item.id)} className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${active === item.id ? 'bg-[#1D7FE8]/15 text-[#1D7FE8]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="ml-3 whitespace-nowrap text-sm opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
        {sidebarRecentPatients.length > 0 && (
          <div className="px-2 pb-20 pt-3">
            <div className="mb-2 flex items-center rounded-lg px-3 py-2.5 text-slate-300">
              <Users className="w-5 h-5 flex-shrink-0" />
              <span className="ml-3 whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Recent Patients</span>
            </div>
            <div className="space-y-2">
              {sidebarRecentPatients.map((patient) => {
                const row = (
                  <>
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4" /></div>
                    <div className="hidden min-w-0 flex-1 group-hover:block">
                      <div className="truncate text-sm font-medium text-white">{patient.name}</div>
                      <div className="truncate text-xs font-mono text-slate-400">{patient.nationalId}</div>
                    </div>
                    <ArrowRight className="medico-sidebar-arrow hidden w-4 h-4 text-slate-500 flex-shrink-0 group-hover:block" />
                  </>
                )

                return patient.href ? (
                  <Link key={patient.id} href={patient.href} className="flex w-full items-center justify-center gap-3 rounded-xl border border-transparent bg-transparent px-0 py-3 text-left transition hover:border-white/10 hover:bg-white/10 group-hover:justify-start group-hover:border-white/10 group-hover:bg-white/5 group-hover:px-3">
                    {row}
                  </Link>
                ) : (
                  <button key={patient.id} onClick={patient.onClick} className="flex w-full items-center justify-center gap-3 rounded-xl border border-transparent bg-transparent px-0 py-3 text-left transition hover:border-white/10 hover:bg-white/10 group-hover:justify-start group-hover:border-white/10 group-hover:bg-white/5 group-hover:px-3">
                    {row}
                  </button>
                )
              })}
            </div>
          </div>
        )}
            <span className="w-5 h-5 flex-shrink-0">←</span>
      </aside>
      <div className="medico-dashboard-content flex-1 ml-16">
        <header className="sticky top-0 z-30 bg-[#0A1628]/80 backdrop-blur-lg border-b border-white/10 h-16 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${roleColor}20`, color: roleColor }}><Icon className="w-5 h-5" /></div>
            <div>
              <div className="font-display font-semibold">{role} Dashboard</div>
              <div className="text-xs text-slate-500">Medico Health Platform</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-r border-white/10 pr-4">
              <span className="rounded-md px-2 py-1 text-xs font-medium" style={{ background: `${roleColor}20`, color: roleColor }}>{role}</span>
              {profileName && (
                <span className="max-w-48 truncate text-sm font-semibold text-slate-100" title={profileName}>
                  {profileName}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:border-red-300/40 hover:bg-red-500/20 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>
        <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8">
          {children}
        </motion.main>
      </div>
    </div>
  )
}

