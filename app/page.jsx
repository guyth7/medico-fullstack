'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Building2,
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
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
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
const websiteUsersCollection = 'website_users'
const staffRequestsCollection = 'staff_requests'

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const createProfileMissingError = () => {
  const error = new Error('No website profile found. Please sign up first and choose your role.')
  error.code = 'medico/profile-missing'
  return error
}

const createApprovalError = (status = 'pending') => {
  const error = new Error(
    status === 'rejected'
      ? 'Your staff access request was not approved. Contact the administrator.'
      : 'Your staff access request is waiting for administrator approval.'
  )
  error.code = status === 'rejected' ? 'medico/request-rejected' : 'medico/request-pending'
  return error
}

const logAuthStep = (stage, details = {}) => {
  console.info(`[Medico auth] ${stage}`, details)
}

const logAuthError = (stage, error, details = {}) => {
  console.error(`[Medico auth] ${stage}`, {
    code: error?.code,
    message: error?.message,
    causeCode: error?.cause?.code,
    causeMessage: error?.cause?.message,
    ...details,
  })
}

const userFacingAuthError = (error) => {
  if (error?.code === 'auth/invalid-credential') return 'Invalid email or password.'
  if (error?.code === 'auth/email-already-in-use') return 'This email already has an account. Sign in or reset the password.'
  if (error?.code === 'permission-denied') return 'Firebase blocked the website profile request. Check Firestore rules for website_users.'
  if (error?.code === 'medico/profile-read-failed') return 'Signed in, but the website profile could not be read. Check Firestore rules for website_users.'
  if (error?.code === 'medico/profile-missing') return error.message
  if (['medico/request-pending', 'medico/request-rejected'].includes(error?.code)) return error.message
  return error?.message || 'Authentication failed'
}

const fallbackDisplayNameForUser = (user) => (
  user?.displayName
  || user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ')
  || 'Medico User'
)

export default function Home() {
  const [mode, setMode] = useState('signin')
  const [activeRole, setActiveRole] = useState('Doctor')
  const [signInForm, setSignInForm] = useState(initialSignIn)
  const [signUpForm, setSignUpForm] = useState(initialSignUp)
  const [profileRepairUser, setProfileRepairUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeRoleConfig = useMemo(
    () => roleSections.find((section) => section.role === activeRole) || roleSections[0],
    [activeRole]
  )

  const dashboardForRole = (role) => roleSections.find((section) => section.role === role)?.dashboard || '/doctor'

  const redirectToDashboard = (role) => {
    const dashboard = dashboardForRole(role)
    logAuthStep('redirect:start', { role, dashboard })
    window.location.href = dashboard
  }

  const readAdminProfile = async (uid) => {
    const snapshot = await getDoc(doc(db, 'admins', uid))
    return snapshot.exists() && snapshot.data()?.active === true
      ? { id: snapshot.id, ...snapshot.data() }
      : null
  }

  const readStaffRequest = async (uid) => {
    const snapshot = await getDoc(doc(db, staffRequestsCollection, uid))
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
  }

  const submitStaffRequest = async ({ user, role, fullName }) => {
    const requestRef = doc(db, staffRequestsCollection, user.uid)
    const existingRequest = await getDoc(requestRef)
    if (existingRequest.exists()) {
      throw createApprovalError(existingRequest.data()?.status)
    }

    await setDoc(requestRef, {
      uid: user.uid,
      fullName: fullName?.trim() || fallbackDisplayNameForUser(user),
      email: normalizeEmail(user.email),
      role,
      status: 'pending',
      requestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const readUserProfile = async (uid) => {
    logAuthStep('profile-read:start', { uid, collection: websiteUsersCollection })

    let profileSnapshot
    try {
      const profileQuery = query(collection(db, websiteUsersCollection), where('uid', '==', uid))
      profileSnapshot = await getDocs(profileQuery)
      logAuthStep('profile-read:legacy-query-result', { uid, count: profileSnapshot.size })
    } catch (error) {
      logAuthError('profile-read:failure', error, { uid, collection: websiteUsersCollection })
      const wrappedError = new Error('Signed in, but the website profile could not be read.')
      wrappedError.code = 'medico/profile-read-failed'
      wrappedError.cause = error
      throw wrappedError
    }

    if (profileSnapshot.empty) {
      logAuthError('profile-read:missing', createProfileMissingError(), { uid })
      return null
    }

    const profileDoc = profileSnapshot.docs.find((item) => item.id === uid) || profileSnapshot.docs[0]
    const profile = profileDoc.data()
    const readableDocumentId = uid
    logAuthStep('profile-read:success', { uid, documentId: profileDoc.id, role: profile.role })

    if (profileDoc.id !== readableDocumentId) {
      try {
        const readableProfileRef = doc(db, websiteUsersCollection, readableDocumentId)
        logAuthStep('profile-migration:start', { uid, from: profileDoc.id, to: readableDocumentId })
        await setDoc(readableProfileRef, {
          ...profile,
          uid,
          authProvider: profile.authProvider || 'password',
          updatedAt: serverTimestamp(),
        }, { merge: true })
        await deleteDoc(profileDoc.ref)
        logAuthStep('profile-migration:success', { uid, from: profileDoc.id, to: readableDocumentId })
        return { id: readableDocumentId, ...profile }
      } catch (error) {
        logAuthError('profile-migration:failure', error, { uid, from: profileDoc.id, to: readableDocumentId })
      }
    }

    return { id: profileDoc.id, ...profile }
  }

  const loadProfileAndRedirect = async (uid) => {
    const adminProfile = await readAdminProfile(uid)
    if (adminProfile) {
      window.location.href = '/admin'
      return
    }

    const profile = await readUserProfile(uid)

    if (!profile) {
      const request = await readStaffRequest(uid)
      if (request) throw createApprovalError(request.status)
      throw createProfileMissingError()
    }

    logAuthStep('profile-read:success', { uid, role: profile.role })
    redirectToDashboard(profile.role)
  }

  const handleEmailAlreadyInUseDuringSignUp = async () => {
    logAuthStep('sign-up:email-already-in-use:recover-start', {
      email: normalizeEmail(signUpForm.email),
      role: activeRoleConfig.role,
    })

    try {
      const credential = await signInWithEmailAndPassword(auth, signUpForm.email.trim(), signUpForm.password)
      logAuthStep('sign-up:email-already-in-use:signin-success', {
        uid: credential.user.uid,
        email: normalizeEmail(credential.user.email),
      })

      const profile = await readUserProfile(credential.user.uid)
      if (profile) {
        redirectToDashboard(profile.role)
        return
      }
      await submitStaffRequest({
        user: credential.user,
        role: activeRoleConfig.role,
        fullName: signUpForm.fullName,
      })
      await signOut(auth)
      setMode('signin')
      toast.success('Registration request submitted. Wait for administrator approval.')
    } catch (signInError) {
      logAuthError('sign-up:email-already-in-use:recover-failure', signInError, {
        email: normalizeEmail(signUpForm.email),
      })

      setMode('signin')
      setSignInForm({ email: signUpForm.email.trim(), password: '' })

      if (['auth/invalid-credential', 'auth/wrong-password'].includes(signInError?.code)) {
        toast.error('That email already exists, but this password did not match. Sign in or reset the password.')
        return
      }

      toast.error(userFacingAuthError(signInError))
    }
  }

  const validateSignIn = () => {
    if (!emailPattern.test(signInForm.email.trim())) return toast.error('Enter a valid email address')
    if (!signInForm.password) return toast.error('Password is required')
    return true
  }

  const validateSignUp = ({ requirePassword = true } = {}) => {
    if (!signUpForm.fullName.trim()) return toast.error(`${activeRoleConfig.nameLabel} is required`)
    if (!emailPattern.test(signUpForm.email.trim())) return toast.error('Enter a valid email address')
    if (requirePassword && signUpForm.password.length < 6) return toast.error('Password must be at least 6 characters')
    if (requirePassword && signUpForm.password !== signUpForm.confirmPassword) return toast.error('Passwords do not match')
    return true
  }

  const handleEmailSignIn = async (event) => {
    event.preventDefault()
    if (!validateSignIn()) return

    setLoading(true)
    let signedInUser = null
    try {
      logAuthStep('sign-in:start', { email: normalizeEmail(signInForm.email) })
      const credential = await signInWithEmailAndPassword(auth, signInForm.email.trim(), signInForm.password)
      signedInUser = credential.user
      logAuthStep('sign-in:credential-valid', {
        uid: credential.user.uid,
        email: normalizeEmail(credential.user.email),
        emailVerified: credential.user.emailVerified,
      })
      await loadProfileAndRedirect(credential.user.uid)
    } catch (error) {
      if (['medico/request-pending', 'medico/request-rejected'].includes(error?.code)) {
        await signOut(auth)
      }
      if (error?.code === 'medico/profile-missing' && signedInUser) {
        setProfileRepairUser({
          uid: signedInUser.uid,
          email: signedInUser.email,
          displayName: signedInUser.displayName,
        })
        setSignUpForm((form) => ({
          ...form,
          fullName: form.fullName || fallbackDisplayNameForUser(signedInUser),
          email: signedInUser.email || signInForm.email.trim(),
          password: '',
          confirmPassword: '',
        }))
        setMode('signup')
        toast('Firebase sign-in worked. Complete the website profile to continue.')
        return
      }

      logAuthError('sign-in:failure', error, {
        email: normalizeEmail(signInForm.email),
        uid: signedInUser?.uid,
      })
      toast.error(userFacingAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (event) => {
    event.preventDefault()
    const completingMissingProfile = Boolean(
      profileRepairUser
      && auth.currentUser?.uid === profileRepairUser.uid
      && normalizeEmail(auth.currentUser?.email) === normalizeEmail(signUpForm.email)
    )
    if (!validateSignUp({ requirePassword: !completingMissingProfile })) return

    setLoading(true)
    try {
      let user = auth.currentUser

      if (completingMissingProfile && user) {
        logAuthStep('profile-repair:start', {
          uid: user.uid,
          email: normalizeEmail(user.email),
          role: activeRoleConfig.role,
        })
      } else {
        logAuthStep('sign-up:start', {
          email: normalizeEmail(signUpForm.email),
          role: activeRoleConfig.role,
        })
        const credential = await createUserWithEmailAndPassword(auth, signUpForm.email.trim(), signUpForm.password)
        user = credential.user
        logAuthStep('sign-up:credential-created', {
          uid: user.uid,
          email: normalizeEmail(user.email),
          emailVerified: user.emailVerified,
        })
      }

      await submitStaffRequest({
        user,
        role: activeRoleConfig.role,
        fullName: signUpForm.fullName,
      })
      await signOut(auth)
      setMode('signin')
      setSignInForm({ email: signUpForm.email.trim(), password: '' })
      toast.success('Registration request submitted. You can sign in after administrator approval.')
      setProfileRepairUser(null)
    } catch (error) {
      if (!completingMissingProfile && error?.code === 'auth/email-already-in-use') {
        await handleEmailAlreadyInUseDuringSignUp()
        return
      }

      logAuthError(profileRepairUser ? 'profile-repair:failure' : 'sign-up:failure', error, {
        email: normalizeEmail(signUpForm.email),
        role: activeRoleConfig.role,
      })
      toast.error(userFacingAuthError(error))
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
    <main className="min-h-screen overflow-x-hidden bg-[#071527] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,127,232,0.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.18),transparent_28%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,64px_64px,64px_64px]" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-10 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section>
          <div className="mb-14 flex items-center gap-4">
            <BrandLogo className="h-14 w-14" />
            <div>
              <div className="font-display text-2xl font-bold leading-tight">Medico</div>
              <div className="mt-1 text-sm text-slate-300">Unified Healthcare Network</div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm text-slate-100">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Secure coordination for clinics, labs, pharmacies, and hospitals
            </div>
            <h1 className="font-display text-5xl font-black leading-[1.08] tracking-tight text-white md:text-7xl">
              Healthcare records,
              <span className="block pb-[0.2em] leading-[1.2] text-cyan-300">
                connected beautifully.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              A modern medical network where teams can identify patients, coordinate records, and move care forward with clarity and trust.
            </p>
          </motion.div>
        </section>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mx-auto w-full max-w-xl">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0F1E36]/95 p-6 pb-10 sm:p-8 sm:pb-10 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:overscroll-contain">
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1" role="tablist" aria-label="Authentication mode">
                {['signin', 'signup'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={mode === item}
                    onClick={() => {
                      if (item === 'signin') setProfileRepairUser(null)
                      setMode(item)
                    }}
                    className={`relative isolate overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 ${mode === item ? 'text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    {mode === item && (
                      <motion.span
                        layoutId="auth-tab-highlight"
                        className="absolute inset-0 -z-10 rounded-xl bg-teal-500/80 shadow-sm shadow-teal-950/30"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      />
                    )}
                    <span className="relative block select-none whitespace-nowrap caret-transparent">
                      {item === 'signin' ? 'Sign In' : 'Sign Up'}
                    </span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
              {mode === 'signin' ? (
                <motion.form key="signin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18, ease: 'easeOut' }} onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Welcome back</h2>
                    <p className="mt-1 text-sm text-slate-300">Access your assigned Medico workspace.</p>
                  </div>
                  <AuthInput icon={Mail} label="Email" type="email" value={signInForm.email} onChange={(value) => setSignInForm({ ...signInForm, email: value })} placeholder="name@medico.com" />
                  <PasswordInput label="Password" value={signInForm.password} onChange={(value) => setSignInForm({ ...signInForm, password: value })} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                  <div className="flex justify-end">
                    <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
                      Forgot Password?
                    </button>
                  </div>
                  <SubmitButton loading={loading}>Sign In</SubmitButton>
                </motion.form>
              ) : (
                <motion.form key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18, ease: 'easeOut' }} onSubmit={handleEmailSignUp} className="space-y-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold">{profileRepairUser ? 'Complete your account' : 'Create your account'}</h2>
                    <p className="mt-1 text-sm text-slate-300">{profileRepairUser ? 'Choose the registration section to restore access.' : 'Choose the registration section. The role is assigned automatically.'}</p>
                  </div>

                  {profileRepairUser && (
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                      Firebase sign-in succeeded. Select the correct role, confirm the name, then complete the profile.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account role">
                    {roleSections.map((section) => {
                      const Icon = section.icon
                      const isActive = activeRole === section.role
                      return (
                        <button
                          key={section.role}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setActiveRole(section.role)}
                          className={`rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 ${isActive ? 'border-cyan-300/70 bg-cyan-300/15 shadow-[0_0_0_1px_rgba(110,231,183,0.28),0_10px_30px_rgba(8,145,178,0.12)]' : 'border-white/10 bg-white/[0.025] text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'}`}
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
                      <AuthInput icon={Mail} label="Email" type="email" value={signUpForm.email} onChange={(value) => setSignUpForm({ ...signUpForm, email: value })} placeholder="name@medico.com" disabled={Boolean(profileRepairUser)} />
                      {!profileRepairUser && (
                        <>
                          <PasswordInput label="Password" value={signUpForm.password} onChange={(value) => setSignUpForm({ ...signUpForm, password: value })} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                          <PasswordInput label="Confirm Password" value={signUpForm.confirmPassword} onChange={(value) => setSignUpForm({ ...signUpForm, confirmPassword: value })} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                        </>
                      )}
                      {!profileRepairUser && signUpForm.confirmPassword && (
                        <p className={`text-xs ${signUpForm.password === signUpForm.confirmPassword ? 'text-emerald-300' : 'text-red-300'}`}>
                          {signUpForm.password === signUpForm.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                        </p>
                      )}
                    </div>
                  </div>

                  <SubmitButton loading={loading}>{profileRepairUser ? `Complete ${activeRoleConfig.role} Profile` : `Create ${activeRoleConfig.role} Account`}</SubmitButton>
                </motion.form>
              )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}

const AuthInput = ({ icon: Icon, label, value, onChange, placeholder, type = 'text', disabled = false }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  </label>
)

const PasswordInput = ({ label, value, onChange, show, onToggle }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="••••••••"
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50 focus:bg-white/[0.08]"
      />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
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
