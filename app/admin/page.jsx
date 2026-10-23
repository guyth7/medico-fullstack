'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  Check,
  ClipboardList,
  Clock3,
  Edit3,
  ExternalLink,
  FileClock,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { toast } from 'sonner'
import { auth, db } from '@/lib/firebase'
import { deletePatientRecord } from '@/lib/patientFirestore'

const tabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'requests', label: 'Requests', icon: ClipboardList },
  { id: 'staff', label: 'Staff', icon: UserRoundCheck },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'audit', label: 'Audit', icon: FileClock },
]

const roles = ['Doctor', 'Hospital', 'Laboratory', 'Pharmacy']
const emptyPatient = {
  name: '',
  nationalId: '',
  yearOfBirth: '',
  gender: '',
  bloodType: '',
  weight: '',
  height: '',
  phone: '',
  email: '',
  emergencyName: '',
  emergencyNumber: '',
  emergencyRelationship: '',
}

const formatDate = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const patientToForm = (patient) => ({
  ...emptyPatient,
  name: patient.name || '',
  nationalId: patient.nationalId || patient.national_id || '',
  yearOfBirth: patient.yearOfBirth ? String(patient.yearOfBirth) : '',
  gender: patient.gender || '',
  bloodType: patient.bloodType || '',
  weight: patient.weight ? String(patient.weight) : '',
  height: patient.height ? String(patient.height) : '',
  phone: patient.phone || '',
  email: patient.email || '',
  emergencyName: patient.emergencyContact?.name || '',
  emergencyNumber: patient.emergencyContact?.number || '',
  emergencyRelationship: patient.emergencyContact?.relationship || '',
})

export default function AdminPage() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [admin, setAdmin] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [requests, setRequests] = useState([])
  const [staff, setStaff] = useState([])
  const [patients, setPatients] = useState([])
  const [audit, setAudit] = useState([])
  const [editingPatient, setEditingPatient] = useState(null)
  const [patientForm, setPatientForm] = useState(emptyPatient)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const writeAudit = async (action, details = {}) => {
    await addDoc(collection(db, 'admin_audit'), {
      action,
      ...details,
      adminUid: auth.currentUser?.uid || '',
      adminEmail: auth.currentUser?.email || '',
      createdAt: serverTimestamp(),
    })
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [requestSnapshot, staffSnapshot, patientSnapshot, mobileUserSnapshot, auditSnapshot] = await Promise.all([
        getDocs(collection(db, 'staff_requests')),
        getDocs(collection(db, 'website_users')),
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'admin_audit'), orderBy('createdAt', 'desc'), limit(100))),
      ])
      const registeredNationalIds = new Set(
        mobileUserSnapshot.docs
          .map((item) => String(item.data().nationalId || item.data().national_id || '').trim())
          .filter((nationalId) => /^\d{11}$/.test(nationalId))
      )
      setRequests(requestSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
      setStaff(staffSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
      setPatients(patientSnapshot.docs.map((item) => {
        const data = item.data()
        const nationalId = String(data.nationalId || data.national_id || '').trim()
        return {
          id: item.id,
          firestoreId: item.id,
          ...data,
          mobileLinked: registeredNationalIds.has(nationalId),
        }
      }))
      setAudit(auditSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    } catch (error) {
      console.error('[Admin] Could not load dashboard data', error)
      toast.error('Could not load admin data from Firebase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/')
        return
      }
      try {
        const adminSnapshot = await getDoc(doc(db, 'admins', user.uid))
        if (!adminSnapshot.exists() || adminSnapshot.data()?.active !== true) {
          await signOut(auth)
          toast.error('This account does not have administrator access.')
          router.replace('/')
          return
        }
        setAdmin({ uid: user.uid, email: user.email, ...adminSnapshot.data() })
        setCheckingAccess(false)
        await loadData()
      } catch (error) {
        console.error('[Admin] Access verification failed', error)
        await signOut(auth)
        router.replace('/')
      }
    })
    return unsubscribe
  }, [router])

  const pendingRequests = useMemo(
    () => requests.filter((item) => item.status === 'pending'),
    [requests]
  )

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase()
    return staff.filter((item) => {
      const matchesRole = roleFilter === 'All' || item.role === roleFilter
      const matchesSearch = !term || [item.fullName, item.email, item.uid, item.role]
        .some((value) => String(value || '').toLowerCase().includes(term))
      return matchesRole && matchesSearch
    })
  }, [roleFilter, search, staff])

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase()
    return patients.filter((item) => !term || [
      item.name,
      item.email,
      item.phone,
      item.nationalId,
      item.national_id,
      item.id,
    ].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [patients, search])

  const approveRequest = async (request) => {
    setBusyId(request.id)
    try {
      const batch = writeBatch(db)
      batch.set(doc(db, 'website_users', request.uid), {
        uid: request.uid,
        fullName: request.fullName,
        email: request.email,
        role: request.role,
        authProvider: 'password',
        approvalStatus: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser.uid,
        createdAt: request.requestedAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      batch.update(doc(db, 'staff_requests', request.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      })
      await batch.commit()
      await writeAudit('staff_request_approved', {
        targetUid: request.uid,
        targetEmail: request.email,
        role: request.role,
      })
      toast.success(`${request.fullName} can now sign in as ${request.role}.`)
      await loadData()
    } catch (error) {
      console.error('[Admin] Approval failed', error)
      toast.error(error.message || 'Could not approve this request.')
    } finally {
      setBusyId('')
    }
  }

  const rejectRequest = async (request) => {
    setBusyId(request.id)
    try {
      await updateDoc(doc(db, 'staff_requests', request.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      })
      await writeAudit('staff_request_rejected', {
        targetUid: request.uid,
        targetEmail: request.email,
        role: request.role,
      })
      toast.success('Request rejected and access remains blocked.')
      await loadData()
    } catch (error) {
      console.error('[Admin] Rejection failed', error)
      toast.error(error.message || 'Could not reject this request.')
    } finally {
      setBusyId('')
    }
  }

  const revokeStaff = async (member) => {
    setBusyId(member.id)
    try {
      await deleteDoc(doc(db, 'website_users', member.id))
      const requestRef = doc(db, 'staff_requests', member.uid)
      const requestSnapshot = await getDoc(requestRef)
      if (requestSnapshot.exists()) {
        await updateDoc(requestRef, {
          status: 'revoked',
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser.uid,
          updatedAt: serverTimestamp(),
        })
      }
      await writeAudit('staff_access_revoked', {
        targetUid: member.uid,
        targetEmail: member.email,
        role: member.role,
      })
      toast.success('Firestore access revoked immediately.')
      await loadData()
    } catch (error) {
      console.error('[Admin] Revoke failed', error)
      toast.error(error.message || 'Could not revoke staff access.')
    } finally {
      setBusyId('')
    }
  }

  const openPatientEditor = (patient) => {
    setEditingPatient(patient)
    setPatientForm(patientToForm(patient))
  }

  const savePatient = async () => {
    if (!editingPatient) return
    if (!patientForm.name.trim()) return toast.error('Patient name is required.')
    if (!/^\d{11}$/.test(patientForm.nationalId)) return toast.error('National ID must be 11 digits.')

    setBusyId(editingPatient.id)
    try {
      const duplicate = patients.find((item) => (
        item.id !== editingPatient.id
        && (item.nationalId || item.national_id) === patientForm.nationalId
      ))
      if (duplicate) return toast.error('Another patient already uses this National ID.')

      const updates = {
        name: patientForm.name.trim(),
        nationalId: patientForm.nationalId,
        national_id: patientForm.nationalId,
        yearOfBirth: patientForm.yearOfBirth ? Number(patientForm.yearOfBirth) : '',
        gender: patientForm.gender,
        bloodType: patientForm.bloodType,
        weight: patientForm.weight ? Number(patientForm.weight) : '',
        height: patientForm.height ? Number(patientForm.height) : '',
        phone: patientForm.phone.trim(),
        email: patientForm.email.trim().toLowerCase(),
        emergencyContact: {
          name: patientForm.emergencyName.trim(),
          number: patientForm.emergencyNumber.trim(),
          relationship: patientForm.emergencyRelationship.trim(),
        },
        updatedAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'patients', editingPatient.id), updates, { merge: true })
      await writeAudit('patient_updated', {
        patientId: editingPatient.id,
        nationalIdLastFour: patientForm.nationalId.slice(-4),
        patientName: patientForm.name.trim(),
      })
      toast.success('Patient information updated in Firestore.')
      setEditingPatient(null)
      await loadData()
    } catch (error) {
      console.error('[Admin] Patient update failed', error)
      toast.error(error.message || 'Could not update the patient.')
    } finally {
      setBusyId('')
    }
  }

  const deletePatient = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      const result = await deletePatientRecord(db, deleteTarget.id)
      await writeAudit('patient_deleted', {
        patientId: deleteTarget.id,
        patientName: deleteTarget.name || '',
        nationalIdLastFour: String(deleteTarget.nationalId || deleteTarget.national_id || '').slice(-4),
        cleanupErrors: result.cleanupErrors.map((item) => item.collection),
      })
      setDeleteTarget(null)
      toast.success(
        result.cleanupErrors.length
          ? 'Patient deleted; some empty descendant cleanup should be checked.'
          : 'Patient and all related medical records were deleted.'
      )
      await loadData()
    } catch (error) {
      console.error('[Admin] Patient deletion failed', error)
      toast.error(error.message || 'Could not delete the patient.')
    } finally {
      setBusyId('')
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    router.replace('/')
  }

  if (checkingAccess) {
    return <div className="flex min-h-screen items-center justify-center bg-[#071426] text-slate-300">Verifying administrator access…</div>
  }

  return (
    <div className="min-h-screen bg-[#071426] text-white">
      <aside className="admin-sidebar fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#0B192D] p-5 lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D7FE8] to-[#10B981]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display font-bold">Medico Admin</div>
            <div className="text-xs text-slate-400">Secure control center</div>
          </div>
        </div>
        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch('') }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${activeTab === tab.id ? 'bg-[#1D7FE8] text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{tab.label}</span>
                {tab.id === 'requests' && pendingRequests.length > 0 && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-[#071426]">{pendingRequests.length}</span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="truncate text-sm font-medium">{admin?.fullName || 'Administrator'}</div>
          <div className="truncate text-xs text-slate-400">{admin?.email}</div>
          <button onClick={handleSignOut} className="mt-3 flex items-center gap-2 text-xs text-red-300 hover:text-red-200">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="admin-dashboard-content min-h-screen lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#071426]/90 px-4 py-4 backdrop-blur-xl sm:px-7">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold">{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
              <p className="text-xs text-slate-400">Live Firebase administration</p>
            </div>
            <div className="flex gap-2 overflow-x-auto lg:hidden">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-lg px-3 py-2 text-xs ${activeTab === tab.id ? 'bg-[#1D7FE8]' : 'bg-white/5 text-slate-300'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-7">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">Loading Firebase data…</div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <Overview staff={staff} patients={patients} pending={pendingRequests} audit={audit} />
              )}

              {activeTab === 'requests' && (
                <section>
                  <SectionHeading title="Registration requests" subtitle="Approve or reject access for new healthcare staff." />
                  <div className="space-y-3">
                    {requests.length === 0 && <Empty message="No staff registration requests yet." />}
                    {requests.map((request) => (
                      <div key={request.id} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display font-semibold">{request.fullName}</h3>
                            <StatusBadge status={request.status} />
                            <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-xs text-sky-300">{request.role}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{request.email}</p>
                          <p className="mt-1 break-all font-mono text-xs text-slate-500">{request.uid}</p>
                          <p className="mt-2 text-xs text-slate-500">Requested {formatDate(request.requestedAt)}</p>
                        </div>
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button disabled={busyId === request.id} onClick={() => rejectRequest(request)} className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 disabled:opacity-50">
                              <X className="h-4 w-4" /> Reject
                            </button>
                            <button disabled={busyId === request.id} onClick={() => approveRequest(request)} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#071426] disabled:opacity-50">
                              <Check className="h-4 w-4" /> Approve
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'staff' && (
                <section>
                  <SectionHeading title="Active staff" subtitle="Approved website users and their Firebase identities." />
                  <Filters search={search} setSearch={setSearch} roleFilter={roleFilter} setRoleFilter={setRoleFilter} showRoles />
                  <DataTable headers={['Name', 'Role', 'Email', 'Firebase UID', 'Registered', 'Access']}>
                    {filteredStaff.map((member) => (
                      <tr key={member.id} className="border-t border-white/10">
                        <Cell strong>{member.fullName}</Cell>
                        <Cell><RoleBadge role={member.role} /></Cell>
                        <Cell>{member.email}</Cell>
                        <Cell mono>{member.uid}</Cell>
                        <Cell>{formatDate(member.createdAt)}</Cell>
                        <Cell>
                          <button disabled={busyId === member.id} onClick={() => revokeStaff(member)} className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-300 disabled:opacity-50">
                            Revoke
                          </button>
                        </Cell>
                      </tr>
                    ))}
                  </DataTable>
                  {filteredStaff.length === 0 && <Empty message="No staff match these filters." />}
                </section>
              )}

              {activeTab === 'patients' && (
                <section>
                  <SectionHeading title="Patients" subtitle="Edit demographics or permanently delete a patient and related medical records." />
                  <Filters search={search} setSearch={setSearch} />
                  <DataTable headers={['Patient', 'National ID', 'Contact', 'Record ID', 'Created', 'Actions']}>
                    {filteredPatients.map((patient) => (
                      <tr key={patient.id} className="border-t border-white/10">
                        <Cell strong>
                          <div>{patient.name || 'Unnamed patient'}</div>
                          <div className="mt-1 text-xs font-normal text-slate-500">{patient.gender || '—'} · {patient.bloodType || '—'} · Born {patient.yearOfBirth || '—'}</div>
                        </Cell>
                        <Cell mono>{patient.nationalId || patient.national_id || '—'}</Cell>
                        <Cell><div>{patient.phone || '—'}</div><div className="text-xs text-slate-500">{patient.email || '—'}</div></Cell>
                        <Cell mono>
                          <div>{patient.id}</div>
                          <div className={`mt-1 text-[10px] ${patient.mobileLinked ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {patient.mobileLinked ? 'Mobile account linked' : 'No mobile account'}
                          </div>
                        </Cell>
                        <Cell>{formatDate(patient.createdAt)}</Cell>
                        <Cell>
                          <div className="flex gap-2">
                            <Link href={`/admin/patient?id=${encodeURIComponent(patient.nationalId || patient.national_id)}`} className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2 text-emerald-300" aria-label="Open full medical record"><ExternalLink className="h-4 w-4" /></Link>
                            <button onClick={() => openPatientEditor(patient)} className="rounded-lg border border-sky-400/25 bg-sky-500/10 p-2 text-sky-300" aria-label="Edit patient"><Edit3 className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteTarget(patient)} className="rounded-lg border border-red-400/25 bg-red-500/10 p-2 text-red-300" aria-label="Delete patient"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </Cell>
                      </tr>
                    ))}
                  </DataTable>
                  {filteredPatients.length === 0 && <Empty message="No patients match this search." />}
                </section>
              )}

              {activeTab === 'audit' && (
                <section>
                  <SectionHeading title="Audit history" subtitle="Immutable record of sensitive administrator actions." />
                  <div className="space-y-2">
                    {audit.length === 0 && <Empty message="No administrator actions recorded yet." />}
                    {audit.map((event) => (
                      <div key={event.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-mono text-sm text-sky-300">{event.action}</div>
                          <div className="mt-1 text-xs text-slate-400">{event.targetEmail || event.patientName || event.targetUid || event.patientId || 'System action'}</div>
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(event.createdAt)} · {event.adminEmail}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {editingPatient && (
        <Modal title={`Edit ${editingPatient.name || 'patient'}`} onClose={() => setEditingPatient(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={patientForm.name} onChange={(value) => setPatientForm({ ...patientForm, name: value })} />
            <Field label="National ID" value={patientForm.nationalId} onChange={(value) => setPatientForm({ ...patientForm, nationalId: value.replace(/\D/g, '').slice(0, 11) })} />
            <Field label="Year of birth" value={patientForm.yearOfBirth} onChange={(value) => setPatientForm({ ...patientForm, yearOfBirth: value.replace(/\D/g, '').slice(0, 4) })} />
            <Field label="Gender" value={patientForm.gender} onChange={(value) => setPatientForm({ ...patientForm, gender: value })} />
            <Field label="Blood type" value={patientForm.bloodType} onChange={(value) => setPatientForm({ ...patientForm, bloodType: value })} />
            <Field label="Phone" value={patientForm.phone} onChange={(value) => setPatientForm({ ...patientForm, phone: value })} />
            <Field label="Email" value={patientForm.email} onChange={(value) => setPatientForm({ ...patientForm, email: value })} />
            <Field label="Weight (kg)" value={patientForm.weight} onChange={(value) => setPatientForm({ ...patientForm, weight: value.replace(/\D/g, '').slice(0, 3) })} />
            <Field label="Height (cm)" value={patientForm.height} onChange={(value) => setPatientForm({ ...patientForm, height: value.replace(/\D/g, '').slice(0, 3) })} />
            <Field label="Emergency contact" value={patientForm.emergencyName} onChange={(value) => setPatientForm({ ...patientForm, emergencyName: value })} />
            <Field label="Emergency number" value={patientForm.emergencyNumber} onChange={(value) => setPatientForm({ ...patientForm, emergencyNumber: value })} />
            <Field label="Relationship" value={patientForm.emergencyRelationship} onChange={(value) => setPatientForm({ ...patientForm, emergencyRelationship: value })} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEditingPatient(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
            <button disabled={busyId === editingPatient.id} onClick={savePatient} className="rounded-xl bg-[#1D7FE8] px-5 py-2 text-sm font-semibold disabled:opacity-50">Save changes</button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Permanently delete patient?" onClose={() => setDeleteTarget(null)}>
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            This deletes <strong>{deleteTarget.name}</strong>, the parent Firestore document, prescriptions, diagnoses, allergies, surgeries, laboratory and radiology records, and stored file chunks. This cannot be undone.
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
            <button disabled={busyId === deleteTarget.id} onClick={deletePatient} className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {busyId === deleteTarget.id ? 'Deleting…' : 'Delete everything'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Overview({ staff, patients, pending, audit }) {
  const linkedPatients = patients.filter((patient) => patient.mobileLinked).length
  const stats = [
    { label: 'Active staff', value: staff.length, icon: UserRoundCheck, color: 'text-emerald-300', bg: 'bg-emerald-400/10' },
    { label: 'Patients', value: patients.length, icon: Users, color: 'text-sky-300', bg: 'bg-sky-400/10' },
    { label: 'Pending requests', value: pending.length, icon: Clock3, color: 'text-amber-300', bg: 'bg-amber-400/10' },
    { label: 'Linked mobile patients', value: linkedPatients, icon: ShieldCheck, color: 'text-violet-300', bg: 'bg-violet-400/10' },
  ]
  return (
    <section>
      <SectionHeading title="System overview" subtitle="Live totals from the shared Firestore database." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}><Icon className="h-5 w-5" /></div>
            <div className="font-display text-3xl font-bold">{value}</div>
            <div className="mt-1 text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-display font-semibold">Staff by role</h3>
          <div className="mt-5 space-y-4">
            {roles.map((role) => {
              const count = staff.filter((member) => member.role === role).length
              const width = staff.length ? Math.max(4, (count / staff.length) * 100) : 0
              return (
                <div key={role}>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-slate-300">{role}</span><span>{count}</span></div>
                  <div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-gradient-to-r from-[#1D7FE8] to-[#10B981]" style={{ width: `${width}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-display font-semibold">Recent administrator activity</h3>
          <div className="mt-4 space-y-3">
            {audit.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 text-sm">
                <span className="font-mono text-sky-300">{event.action}</span>
                <span className="text-xs text-slate-500">{formatDate(event.createdAt)}</span>
              </div>
            ))}
            {audit.length === 0 && <p className="text-sm text-slate-500">No actions recorded yet.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

const SectionHeading = ({ title, subtitle }) => (
  <div className="mb-5">
    <h2 className="font-display text-2xl font-bold">{title}</h2>
    <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
  </div>
)

const Filters = ({ search, setSearch, roleFilter, setRoleFilter, showRoles = false }) => (
  <div className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row">
    <label className="flex flex-1 items-center gap-2 rounded-lg bg-[#071426] px-3">
      <Search className="h-4 w-4 text-slate-500" />
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, UID, national ID…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
    </label>
    {showRoles && (
      <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-lg border border-white/10 bg-[#071426] px-3 py-2 text-sm">
        <option>All</option>
        {roles.map((role) => <option key={role}>{role}</option>)}
      </select>
    )}
  </div>
)

const DataTable = ({ headers, children }) => (
  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
    <table className="w-full min-w-[900px] text-left text-sm">
      <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
        <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
)

const Cell = ({ children, strong = false, mono = false }) => (
  <td className={`px-4 py-4 align-top text-slate-300 ${strong ? 'font-semibold text-white' : ''} ${mono ? 'max-w-[220px] break-all font-mono text-xs' : ''}`}>{children}</td>
)

const RoleBadge = ({ role }) => (
  <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300">{role}</span>
)

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-amber-400/10 text-amber-300',
    approved: 'bg-emerald-400/10 text-emerald-300',
    rejected: 'bg-red-400/10 text-red-300',
    revoked: 'bg-slate-400/10 text-slate-300',
  }
  return <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${styles[status] || styles.revoked}`}>{status}</span>
}

const Empty = ({ message }) => (
  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">{message}</div>
)

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0B192D] p-5 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <button onClick={onClose} className="rounded-lg bg-white/5 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      {children}
    </div>
  </div>
)

const Field = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#071426] px-3 py-2.5 text-sm outline-none focus:border-[#1D7FE8]" />
  </label>
)
