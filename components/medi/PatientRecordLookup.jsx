'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Plus, Phone, AtSign, Edit2, Trash2 } from 'lucide-react'
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { toast } from 'sonner'
import { auth, db } from '@/lib/firebase'
import { deletePatientRecord, ensurePatientSubcollections, listPatients, patientDocumentId } from '@/lib/patientFirestore'
import { getMedicalRecordPermissions } from '@/lib/medicalRecordPermissions'
import { getPatientYearOfBirth } from '@/lib/patientDemographics'
import { ConfirmModal, DashboardShell, SlideOverPanel } from '@/components/medi/shared'
import PatientDetail from '@/app/doctor/patient/[id]/page'

const emptyPatientForm = {
  name: '',
  nationalId: '',
  yearOfBirth: '',
  gender: '',
  bloodType: '',
  weight: '',
  height: '',
  phone: '',
  email: '',
  emergencyContact: { name: '', number: '', relationship: 'Parent' },
}
const genderOptions = ['Male', 'Female']
const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const relationshipOptions = ['Parent', 'Spouse', 'Sibling', 'Child', 'Relative', 'Friend', 'Guardian']
const patientNameMaxLength = 40
const emergencyContactNameMaxLength = 15
const lettersOnly = (value) => value.replace(/[^a-zA-Z\s'-]/g, '').slice(0, patientNameMaxLength)
const emergencyContactNameOnly = (value) => value.replace(/[^a-zA-Z\s'-]/g, '').slice(0, emergencyContactNameMaxLength)
const digitsOnly = (value, maxLength) => value.replace(/\D/g, '').slice(0, maxLength)
const phoneValue = (value) => {
  const cleaned = value.replace(/[^\d+]/g, '')
  return `${cleaned.startsWith('+') ? '+' : ''}${cleaned.replace(/\+/g, '').slice(0, 15)}`
}
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isValidPhone = (value) => /^\+?\d{8,15}$/.test(value)

export default function PatientRecordLookup({ role, roleColor, icon: Icon, basePath }) {
  const patientPermissions = getMedicalRecordPermissions(role, 'patients')
  const [patients, setPatients] = useState([])
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [panel, setPanel] = useState(null)
  const [patientForm, setPatientForm] = useState(emptyPatientForm)
  const [editingPatient, setEditingPatient] = useState(null)
  const [patientToDelete, setPatientToDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchPatients = async () => {
    try {
      setPatients(await listPatients(db))
    } catch (error) {
      console.error('Could not load patients from Firebase:', error)
      toast.error('Could not load patients from Firebase')
    }
  }

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !active) return

      try {
        // Custom claims are carried by the ID token. Force a refresh before
        // the first secured Firestore query after onboarding or claim seeding.
        await user.getIdToken(true)
        if (active) await fetchPatients()
      } catch (error) {
        console.error('Could not refresh Firebase access:', error)
        if (active) toast.error('Could not verify Firebase access. Please sign in again.')
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const onSearch = () => {
    const query = q.trim().toLowerCase()
    if (!query) return

    setResults(patients.filter((patient) => (
      patient.nationalId?.includes(q.trim()) ||
      patient.name?.toLowerCase().includes(query)
    )))
  }

  const validatePatientForm = () => {
    if (!patientForm.name.trim()) return toast.error('Patient name is required')
    if (!/^[a-zA-Z\s'-]+$/.test(patientForm.name.trim())) return toast.error('Patient name can contain letters only')
    if (patientForm.name.trim().length > patientNameMaxLength) return toast.error(`Patient name must be ${patientNameMaxLength} characters or less`)
    if (!/^\d{11}$/.test(patientForm.nationalId)) return toast.error('National ID must be exactly 11 digits')
    if (patientForm.yearOfBirth && !/^\d{4}$/.test(patientForm.yearOfBirth)) return toast.error('Year of birth must be exactly 4 digits')
    if (!genderOptions.includes(patientForm.gender)) return toast.error('Choose Male or Female')
    if (!bloodTypeOptions.includes(patientForm.bloodType)) return toast.error('Choose a valid blood type')
    if (patientForm.weight && !/^\d{1,3}$/.test(patientForm.weight)) return toast.error('Weight must be 1 to 3 digits in kg')
    if (patientForm.height && !/^\d{1,3}$/.test(patientForm.height)) return toast.error('Height must be 1 to 3 digits in cm')
    if (patientForm.phone && !isValidPhone(patientForm.phone)) return toast.error('Enter a valid phone number')
    if (patientForm.email && !isValidEmail(patientForm.email)) return toast.error('Enter a valid email address')
    if (!patientForm.emergencyContact.name.trim()) return toast.error('Emergency contact name is required')
    if (!/^[a-zA-Z\s'-]+$/.test(patientForm.emergencyContact.name.trim())) return toast.error('Emergency contact name can contain letters only')
    if (patientForm.emergencyContact.name.trim().length > emergencyContactNameMaxLength) return toast.error(`Emergency contact name must be ${emergencyContactNameMaxLength} characters or less`)
    if (!isValidPhone(patientForm.emergencyContact.number)) return toast.error('Emergency contact number must contain 8 to 15 digits')
    if (!relationshipOptions.includes(patientForm.emergencyContact.relationship)) return toast.error('Choose a valid emergency contact relationship')
    return true
  }

  const handleAddPatient = async () => {
    if (!patientPermissions.add) return toast.error(`${role} accounts have read-only access`)
    if (!validatePatientForm()) return
    if (!patientForm.name.trim()) return toast.error('Patient name is required')
    if (!/^[a-zA-Z\s'-]+$/.test(patientForm.name.trim())) return toast.error('Patient name can contain letters only')
    if (patientForm.name.trim().length > patientNameMaxLength) return toast.error(`Patient name must be ${patientNameMaxLength} characters or less`)
    if (!/^\d{11}$/.test(patientForm.nationalId)) return toast.error('National ID must be exactly 11 digits')
    if (patientForm.yearOfBirth && !/^\d{4}$/.test(patientForm.yearOfBirth)) return toast.error('Year of birth must be exactly 4 digits')
    if (!genderOptions.includes(patientForm.gender)) return toast.error('Choose Male or Female')
    if (!bloodTypeOptions.includes(patientForm.bloodType)) return toast.error('Choose a valid blood type')
    if (patientForm.weight && !/^\d{1,3}$/.test(patientForm.weight)) return toast.error('Weight must be 1 to 3 digits in kg')
    if (patientForm.height && !/^\d{1,3}$/.test(patientForm.height)) return toast.error('Height must be 1 to 3 digits in cm')
    if (patientForm.phone && !isValidPhone(patientForm.phone)) return toast.error('Enter a valid phone number')
    if (patientForm.email && !isValidEmail(patientForm.email)) return toast.error('Enter a valid email address')
    if (!patientForm.emergencyContact.name.trim()) return toast.error('Emergency contact name is required')
    if (!/^[a-zA-Z\s'-]+$/.test(patientForm.emergencyContact.name.trim())) return toast.error('Emergency contact name can contain letters only')
    if (patientForm.emergencyContact.name.trim().length > emergencyContactNameMaxLength) return toast.error(`Emergency contact name must be ${emergencyContactNameMaxLength} characters or less`)
    if (!isValidPhone(patientForm.emergencyContact.number)) return toast.error('Emergency contact number must contain 8 to 15 digits')
    if (!relationshipOptions.includes(patientForm.emergencyContact.relationship)) return toast.error('Choose a valid emergency contact relationship')

    setSaving(true)
    try {
      const patientData = {
        ...patientForm,
        name: patientForm.name.trim(),
        nationalId: patientForm.nationalId.trim(),
        yearOfBirth: patientForm.yearOfBirth ? Number(patientForm.yearOfBirth) : '',
        weight: patientForm.weight ? Number(patientForm.weight) : '',
        height: patientForm.height ? Number(patientForm.height) : '',
        emergencyContact: {
          ...patientForm.emergencyContact,
          name: patientForm.emergencyContact.name.trim(),
        },
        createdAt: serverTimestamp(),
      }
      // STEP 2: exact duplicate National ID check on the 'nationalId' field in 'patients'.
      const q = query(collection(db, 'patients'), where('nationalId', '==', patientData.nationalId));
      const querySnapshot = await getDocs(q);

      // STEP 3 (strict, fail-closed): block duplicates AND block on any check error.
      if (!querySnapshot.empty) {
        toast.error('This National ID is already in use.')
        return
      }

      const patientId = patientDocumentId(patientData)
      // Fail-closed duplicate National ID check on EDIT: block if another patient owns this ID.
      const editQ = query(collection(db, 'patients'), where('nationalId', '==', patientData.nationalId));
      const editSnapshot = await getDocs(editQ);
      const otherOwner = editSnapshot.docs.find((d) => d.id !== patientId);
      if (otherOwner) {
        toast.error('This National ID is already in use.');
        return;
      }

      await setDoc(doc(db, 'patients', patientId), patientData, { merge: true })
      ensurePatientSubcollections(db, patientId).catch((error) => {
        console.warn('Patient saved, but optional subcollection markers could not be created:', error)
      })
      const newPatient = { id: patientId, firestoreId: patientId, ...patientData }
      setPatients((items) => [newPatient, ...items])
      setPanel(null)
      setPatientForm(emptyPatientForm)
      toast.success('Patient saved to Firebase')
    } catch (error) {
      console.error(error)
      toast.error('Could not save patient to Firebase')
    } finally {
      setSaving(false)
    }
  }

  const openEditPatient = (patient) => {
    setEditingPatient(patient)
    const { age: legacyAge, ...patientWithoutLegacyAge } = patient
    setPatientForm({
      ...emptyPatientForm,
      ...patientWithoutLegacyAge,
      yearOfBirth: getPatientYearOfBirth(patient),
      weight: patient.weight ? String(patient.weight) : '',
      height: patient.height ? String(patient.height) : '',
      emergencyContact: {
        ...emptyPatientForm.emergencyContact,
        ...(patient.emergencyContact || {}),
      },
    })
    setPanel('editPatient')
  }

  const handleUpdatePatient = async () => {
    if (!patientPermissions.edit) return toast.error(`${role} accounts have read-only access`)
    if (!editingPatient) return
    if (!validatePatientForm()) return

    setSaving(true)
    try {
      const oldPatientId = editingPatient.firestoreId || editingPatient.id || patientDocumentId(editingPatient)
      const patientId = oldPatientId
      const patientData = {
        ...patientForm,
        name: patientForm.name.trim(),
        nationalId: patientForm.nationalId.trim(),
        yearOfBirth: patientForm.yearOfBirth ? Number(patientForm.yearOfBirth) : '',
        weight: patientForm.weight ? Number(patientForm.weight) : '',
        height: patientForm.height ? Number(patientForm.height) : '',
        emergencyContact: {
          ...patientForm.emergencyContact,
          name: patientForm.emergencyContact.name.trim(),
        },
      }

      // Fail-closed duplicate National ID check on EDIT: block if another patient owns this ID.
      const editQ = query(collection(db, 'patients'), where('nationalId', '==', patientData.nationalId));
      const editSnapshot = await getDocs(editQ);
      const otherOwner = editSnapshot.docs.find((d) => d.id !== patientId);
      if (otherOwner) {
        toast.error('This National ID is already in use.');
        return;
      }

      // A Firestore document ID is the record's stable database identity. Editing
      // a name or National ID must not turn a normal update into a copy/delete
      // operation, which can fail when the patient has nested medical records.
      await setDoc(doc(db, 'patients', patientId), patientData, { merge: true })
      const updatedPatient = { ...editingPatient, ...patientData, id: patientId, firestoreId: patientId }
      setPatients((items) => items.map((item) => ((item.firestoreId || item.id) === oldPatientId ? updatedPatient : item)))
      setResults((items) => items ? items.map((item) => ((item.firestoreId || item.id) === oldPatientId ? updatedPatient : item)) : items)
      setPanel(null)
      setEditingPatient(null)
      setPatientForm(emptyPatientForm)
      toast.success('Patient record updated')
    } catch (error) {
      console.error(error)
      toast.error('Could not update patient record')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePatient = async () => {
    if (!patientPermissions.delete) return toast.error(`${role} accounts have read-only access`)
    if (!patientToDelete) return

    const patientId = patientToDelete.firestoreId || patientToDelete.id
    if (!patientId) {
      const error = new Error('The selected patient does not have a Firestore document ID.')
      console.error('Critical: Failed to delete patient from Firestore:', error)
      alert(`Database Error: Could not delete the record. ${error.message}`)
      return
    }

    setDeleting(true)
    try {
      await deletePatientRecord(db, patientId)

      setPatients((prev) => prev.filter((patient) => (patient.firestoreId || patient.id) !== patientId))
      setResults((prev) => prev ? prev.filter((patient) => (patient.firestoreId || patient.id) !== patientId) : prev)
      if (selectedId === patientToDelete.nationalId) setSelectedId(null)
      setPatientToDelete(null)
      toast.success('Patient record deleted successfully from the database.')
    } catch (error) {
      console.error('Critical: Failed to delete patient from Firestore:', error)
      toast.error(`Database deletion failed: ${error?.message || 'Unknown Firebase error'}`)
      alert(`Database Error: Could not delete the record. ${error?.message || 'Unknown Firebase error'}`)
    } finally {
      setDeleting(false)
    }
  }

  if (selectedId) return <PatientDetail patientId={selectedId} activeRole={role} backHref={basePath} onBack={() => setSelectedId(null)} />

  return (
    <DashboardShell
      role={role}
      roleColor={roleColor}
      icon={Icon}
      sidebarRecentPatients={patients.slice(0, 4).map((patient) => ({
        id: patient.id,
        name: patient.name,
        nationalId: patient.nationalId,
        onClick: () => setSelectedId(patient.nationalId),
      }))}
    >
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#1D7FE8] items-center justify-center mb-4">
            <Icon className="w-8 h-8" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Patient Lookup</h1>
          <p className="text-slate-400">Search by National ID or patient name to open the medical record</p>
        </motion.div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex gap-2 mb-4">
          <div className="flex-1 flex items-center gap-3 px-4">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onSearch()}
              placeholder="Enter National ID (e.g., 1234567890)"
              className="flex-1 bg-transparent outline-none py-3 font-mono text-sm"
            />
          </div>
          <button onClick={onSearch} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#1D7FE8] to-[#10B981] font-medium text-sm">Search</button>
        </div>
        {patientPermissions.add && <div className="mb-8 flex justify-end">
          <button onClick={() => setPanel('patient')} className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 border border-white/10 hover:bg-white/10">
            <Plus className="w-4 h-4" /> Add Patient
          </button>
        </div>}

        {results !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <h3 className="font-display font-semibold mb-3 text-slate-300">{results.length} result{results.length !== 1 ? 's' : ''}</h3>
            <div className="space-y-2">
              {results.length === 0 && <div className="text-slate-500 text-sm bg-white/5 rounded-xl p-6 text-center">No patients matched your search</div>}
              {results.map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition">
                  <button onClick={() => setSelectedId(patient.nationalId)} className="min-w-0 flex flex-1 items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1D7FE8] to-[#10B981] flex items-center justify-center font-display font-bold">{(patient.name || 'Patient').split(' ').map((n) => n[0]).slice(0, 2).join('')}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-semibold">{patient.name || 'Unnamed Patient'}</div>
                      <div className="text-xs text-slate-400 font-mono">ID {patient.nationalId} - Born {getPatientYearOfBirth(patient) || 'N/A'} - {patient.gender} - {patient.bloodType}</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </button>
                  {(patientPermissions.edit || patientPermissions.delete) && <div className="flex shrink-0 items-center gap-2 border-l border-white/10 pl-3">
                    {patientPermissions.edit && <button onClick={() => openEditPatient(patient)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-400/20">
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>}
                    {patientPermissions.delete && <button onClick={() => setPatientToDelete(patient)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>}
                  </div>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      <AddPatientPanel open={panel === 'patient'} form={patientForm} setForm={setPatientForm} saving={saving} onClose={() => setPanel(null)} onSubmit={handleAddPatient} />
      <AddPatientPanel open={panel === 'editPatient'} title="Edit Patient" submitLabel="Save Changes" form={patientForm} setForm={setPatientForm} saving={saving} onClose={() => { setPanel(null); setEditingPatient(null); setPatientForm(emptyPatientForm) }} onSubmit={handleUpdatePatient} />
      <ConfirmModal open={Boolean(patientToDelete)} onClose={() => !deleting && setPatientToDelete(null)} onConfirm={handleDeletePatient} title="Delete patient record?" body={`Are you sure you want to delete ${patientToDelete?.name || 'this patient'}? This action cannot be undone.`} confirmLabel={deleting ? 'Deleting...' : 'Delete'} />
    </DashboardShell>
  )
}

const AddPatientPanel = ({ open, title = 'Add Patient', submitLabel = 'Save Patient to Firebase', form, setForm, saving, onClose, onSubmit }) => (
  <SlideOverPanel open={open} onClose={onClose} title={title}>
    <div className="space-y-3">
      <PatientInput label="Full Name" value={form.name} onChange={(value) => setForm({ ...form, name: lettersOnly(value) })} placeholder="e.g., Ahmad Al-Hassan" maxLength={patientNameMaxLength} />
      <PatientInput label="National ID" value={form.nationalId} onChange={(value) => setForm({ ...form, nationalId: digitsOnly(value, 11) })} placeholder="11 digits" inputMode="numeric" maxLength={11} />
      <div className="grid grid-cols-2 gap-2">
        <PatientInput label="Year of Birth" value={form.yearOfBirth} onChange={(value) => setForm({ ...form, yearOfBirth: digitsOnly(value, 4) })} placeholder="YYYY" inputMode="numeric" maxLength={4} />
        <PatientSelect label="Gender" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} options={genderOptions} placeholder="Select gender" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <PatientSelect label="Blood" value={form.bloodType} onChange={(value) => setForm({ ...form, bloodType: value })} options={bloodTypeOptions} placeholder="Type" />
        <PatientInput label="Weight" value={form.weight} onChange={(value) => setForm({ ...form, weight: digitsOnly(value, 3) })} inputMode="numeric" maxLength={3} suffix="kg" />
        <PatientInput label="Height" value={form.height} onChange={(value) => setForm({ ...form, height: digitsOnly(value, 3) })} inputMode="numeric" maxLength={3} suffix="cm" />
      </div>
      <PatientInput label="Phone" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: phoneValue(value) })} placeholder="+963944123456" inputMode="tel" maxLength={16} icon={Phone} />
      <PatientInput label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value.trim() })} placeholder="patient@example.com" icon={AtSign} />
      <div className="pt-2">
        <div className="mb-3 border-t border-white/10 pt-4">
          <h3 className="font-display text-sm font-semibold text-slate-200">Emergency Contact</h3>
        </div>
        <div className="space-y-3">
          <PatientInput label="Full Name" value={form.emergencyContact.name} onChange={(value) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: emergencyContactNameOnly(value) } })} placeholder="e.g., Ahmad Hassan" maxLength={emergencyContactNameMaxLength} />
          <PatientInput label="Number" type="tel" value={form.emergencyContact.number} onChange={(value) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, number: phoneValue(value) } })} placeholder="+963944123456" inputMode="tel" maxLength={16} icon={Phone} />
          <PatientSelect label="Relationship" value={form.emergencyContact.relationship} onChange={(value) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: value } })} options={relationshipOptions} placeholder="Select relationship" />
        </div>
      </div>
      <button disabled={saving} onClick={onSubmit} className="w-full py-3 rounded-lg bg-gradient-to-r from-[#1D7FE8] to-[#10B981] font-medium text-sm disabled:opacity-60">{saving ? 'Saving...' : submitLabel}</button>
    </div>
  </SlideOverPanel>
)

const PatientInput = ({ label, value, onChange, placeholder = '', type = 'text', inputMode, maxLength, suffix, icon: Icon }) => (
  <div>
    <label className="text-xs text-slate-400 mb-1 block">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />}
      <input type={type} inputMode={inputMode} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`w-full bg-white/5 border border-white/10 rounded-lg py-2 text-sm outline-none focus:border-[#1D7FE8] ${Icon ? 'pl-9' : 'px-3'} ${suffix ? 'pr-10' : ''}`} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span>}
    </div>
  </div>
)

const PatientSelect = ({ label, value, onChange, options, placeholder }) => (
  <div>
    <label className="text-xs text-slate-400 mb-1 block">{label}</label>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D7FE8]">
      <option value="" className="bg-[#0F1E36]">{placeholder}</option>
      {options.map((option) => <option key={option} value={option} className="bg-[#0F1E36]">{option}</option>)}
    </select>
  </div>
)








