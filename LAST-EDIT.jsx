'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FlaskConical,
  Hospital,
  Loader2,
  Lock,
  Mail,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { toast } from 'sonner'
import { auth, db } from '@/lib/firebase'
import { BrandLogo } from '@/components/medi/shared'

const roleSections = [
  { role: 'Doctor', label: 'Doctor Registration', nameLabel: 'Full Name', icon: Stethoscope, color: '#10B981', dashboard: '/doctor' },
  { role: 'Hospital', label: 'Hospital Registration', nameLabel: 'Hospital Name', icon: Hospital, color: '#EF4444', dashboard: '/hospital' },
  { role: 'Laboratory', label: 'Laboratory Registration', nameLabel: 'Laboratory Name', icon: FlaskConical, color: '#8B5CF6', dashboard: '/laboratory' },
  { role: 'Pharmacy', label: 'Pharmacy Registration', nameLabel: 'Pharmacy Name', icon: Pill, color: '#F59E0B', dashboard: '/pharmacy' },
]

const initialSignIn = { email: '', password: '' }
const initialSignUp = { fullName: '', email: '', password: '', confirmPassword: '' }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const websiteUserDocumentId = (fullName) => {
  const readableName = String(fullName || 'medico-user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'medico-user'

  return readableName
}

export default function Home() {
  const [mode, setMode] = useState('signin')
  const [activeRole, setActiveRole] = useState('Doctor')
  const [signInForm, setSignInForm] = useState(initialSignIn)
  const [signUpForm, setSignUpForm] = useState(initialSignUp)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeRoleConfig = useMemo(
    () => roleSections.find((section) => section.role === activeRole) || roleSections[0],
    [activeRole]
  )

  const dashboardForRole = (role) => roleSections.find((section) => section.role === role)?.dashboard || '/doctor'

  const saveUserProfile = async ({ user, role, fullName, authProvider }) => {
    const displayName = fullName?.trim() || user.displayName || user.email?.split('@')[0] || 'Medico User'

    await setDoc(doc(db, 'website_users', websiteUserDocumentId(displayName)), {
      uid: user.uid,
      fullName: displayName,
      email: user.email,
      role,
      createdAt: serverTimestamp(),
      authProvider,
    }, { merge: true })
  }

  const loadProfileAndRedirect = async (uid) => {
    const profileQuery = query(collection(db, 'website_users'), where('uid', '==', uid))
    const profileSnapshot = await getDocs(profileQuery)

    if (profileSnapshot.empty) {
      setMode('signup')
      throw new Error('No website profile found. Please sign up first and choose your role.')
    }

    const profile = profileSnapshot.docs[0].data()
    window.location.href = dashboardForRole(profile.role)
  }

  const validateSignIn = () => {
    if (!emailPattern.test(signInForm.email.trim())) return toast.error('Enter a valid email address')
    if (!signInForm.password) return toast.error('Password is required')
    return true
  }

  const validateSignUp = () => {
    if (!signUpForm.fullName.trim()) return toast.error(`${activeRoleConfig.nameLabel} is required`)
    if (!emailPattern.test(signUpForm.email.trim())) return toast.error('Enter a valid email address')
    if (signUpForm.password.length < 6) return toast.error('Password must be at least 6 characters')
    if (signUpForm.password !== signUpForm.confirmPassword) return toast.error('Passwords do not match')
    return true
  }

  const handleEmailSignIn = async (event) => {
    event.preventDefault()
    if (!validateSignIn()) return

    setLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, signInForm.email.trim(), signInForm.password)
      await loadProfileAndRedirect(credential.user.uid)
    } catch (error) {
      toast.error(error.message || 'Could not sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (event) => {
    event.preventDefault()
    if (!validateSignUp()) return

    setLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, signUpForm.email.trim(), signUpForm.password)
      await saveUserProfile({
        user: credential.user,
        role: activeRoleConfig.role,
        fullName: signUpForm.fullName,
        authProvider: 'password',
      })
      toast.success(`${activeRoleConfig.role} account created`)
      window.location.href = activeRoleConfig.dashboard
    } catch (error) {
      toast.error(error.message || 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!emailPattern.test(signInForm.email.trim())) return toast.error('Enter your email first')

    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, signInForm.email.trim())
      toast.success('Password reset email sent')
    } catch (error) {
      toast.error(error.message || 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#071527] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,127,232,0.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.18),transparent_28%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,64px_64px,64px_64px]" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-10 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section>
          <div className="mb-14 flex items-center gap-3">
            <BrandLogo className="h-11 w-11" />
            <div>
              <div className="font-display text-xl font-bold">Medico</div>
              <div className="text-xs text-slate-400">Unified Healthcare Network</div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Secure coordination for clinics, labs, pharmacies, and hospitals
            </div>
            <h1 className="font-display text-5xl font-black tracking-tight text-white md:text-7xl">
              Healthcare records,
              <span className="block bg-gradient-to-r from-[#1D7FE8] via-cyan-300 to-[#10B981] bg-clip-text text-transparent">
                connected beautifully.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              A modern medical network where teams can identify patients, coordinate records, and move care forward with clarity and trust.
            </p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {['Role-based access', 'Firebase backed', 'Built for fast care'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mx-auto w-full max-w-xl">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0F1E36]/95 p-6">
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
                {['signin', 'signup'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setMode(item)}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === item ? 'bg-gradient-to-r from-[#1D7FE8] to-[#10B981] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    {item === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {mode === 'signin' ? (
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Welcome back</h2>
                    <p className="mt-1 text-sm text-slate-400">Access your assigned Medico workspace.</p>
                  </div>
                  <AuthInput icon={Mail} label="Email" type="email" value={signInForm.email} onChange={(value) => setSignInForm({ ...signInForm, email: value })} placeholder="name@medico.com" />
                  <PasswordInput label="Password" value={signInForm.password} onChange={(value) => setSignInForm({ ...signInForm, password: value })} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                  <div className="flex justify-end">
                    <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
                      Forgot Password?
                    </button>
                  </div>
                  <SubmitButton loading={loading}>Sign In</SubmitButton>
                </form>
              ) : (
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Create your account</h2>
                    <p className="mt-1 text-sm text-slate-400">Choose the registration section. The role is assigned automatically.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {roleSections.map((section) => {
                      const Icon = section.icon
                      const isActive = activeRole === section.role
                      return (
                        <button
                          key={section.role}
                          type="button"
                          onClick={() => setActiveRole(section.role)}
                          className={`rounded-2xl border p-3 text-left transition ${isActive ? 'border-white/25 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${section.color}22`, color: section.color }}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="text-sm font-semibold">{section.label}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: activeRoleConfig.color }}>
                      <activeRoleConfig.icon className="h-4 w-4" />
                      Active role: {activeRoleConfig.role}
                    </div>
                    <div className="space-y-4">
                      <AuthInput icon={activeRoleConfig.role === 'Doctor' ? UserRound : Building2} label={activeRoleConfig.nameLabel} value={signUpForm.fullName} onChange={(value) => setSignUpForm({ ...signUpForm, fullName: value })} placeholder={activeRoleConfig.role === 'Doctor' ? 'Dr. Ahmad Hassan' : `${activeRoleConfig.role} entity name`} />
                      <AuthInput icon={Mail} label="Email" type="email" value={signUpForm.email} onChange={(value) => setSignUpForm({ ...signUpForm, email: value })} placeholder="name@medico.com" />
                      <PasswordInput label="Password" value={signUpForm.password} onChange={(value) => setSignUpForm({ ...signUpForm, password: value })} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                      <PasswordInput label="Confirm Password" value={signUpForm.confirmPassword} onChange={(value) => setSignUpForm({ ...signUpForm, confirmPassword: value })} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                      {signUpForm.confirmPassword && (
                        <p className={`text-xs ${signUpForm.password === signUpForm.confirmPassword ? 'text-emerald-300' : 'text-red-300'}`}>
                          {signUpForm.password === signUpForm.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                        </p>
                      )}
                    </div>
                  </div>

                  <SubmitButton loading={loading}>Create {activeRoleConfig.role} Account</SubmitButton>
                </form>
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}

const AuthInput = ({ icon: Icon, label, value, onChange, placeholder, type = 'text' }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:bg-white/[0.08]"
      />
    </div>
  </label>
)

const PasswordInput = ({ label, value, onChange, show, onToggle }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="••••••••"
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:bg-white/[0.08]"
      />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </label>
)

const SubmitButton = ({ loading, children }) => (
  <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D7FE8] to-[#10B981] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
    {children}
  </button>
)
