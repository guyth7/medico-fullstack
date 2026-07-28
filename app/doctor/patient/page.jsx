'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, FileText, Activity, Pill, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { canUseMedicalRecordAction, getMedicalRecordPermissions } from '@/lib/medicalRecordPermissions'
import { StatusBadge, PatientSummaryCard, SlideOverPanel, EmptyState, ConfirmModal } from '@/components/medi/shared'
import MedicoLoadingScreen from '@/components/medi/MedicoLoadingScreen'

const emptyRxItem = { name: '', dosage: '', frequency: 'Once daily', duration: '', notes: '' }
const emptyFileForm = { type: '', labName: '', date: '', file: null, fileName: '', fileUrl: '', fileType: '' }
const emptyDxForm = { name: '', date: '' }
const emptySurgForm = { name: '', date: '', surgeon: '', hospital: '', notes: '' }
const allergyNameMaxLength = 25
const diagnosisNameMaxLength = 30
const surgeryTextMaxLength = 30
const surgeryNotesMaxLength = 50
const allergyLettersOnly = (value) => String(value || '').replace(/[^a-zA-Z\s'-]/g, '').slice(0, allergyNameMaxLength)
const surgeryLettersOnly = (value) => String(value || '').replace(/[^a-zA-Z\s'-]/g, '').slice(0, surgeryTextMaxLength)
const fileRecordTypeMaxLength = 20
const fileRecordLabNameMaxLength = 25
const fileRecordLabNameOnly = (value) => String(value || '').replace(/[^a-zA-Z\s'-]/g, '').slice(0, fileRecordLabNameMaxLength)
const digitsOnly = (value, maxLength) => String(value || '').replace(/\D/g, '').slice(0, maxLength)
const formatNumberUnit = (value, unit) => {
  const digits = String(value || '').replace(/\D/g, '')
  return digits ? `${digits} ${unit}` : ''
}
const firestoreInlineFileMaxBase64Length = 850 * 1024

export default function PatientDetail({ patientId: patientIdProp, activeRole = 'Doctor', backHref = '/doctor', onBack }) {
  const searchParams = useSearchParams()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [panel, setPanel] = useState(null)
  const [rxItems, setRxItems] = useState([emptyRxItem])
  const [allergies, setAllergies] = useState([])
  const [labs, setLabs] = useState([])
  const [radiology, setRadiology] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [surgeries, setSurgeries] = useState([])
  const [deleteMode, setDeleteMode] = useState(null)
  const [editMode, setEditMode] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [selectedAllergies, setSelectedAllergies] = useState([])
  const [selectedLabIds, setSelectedLabIds] = useState([])
  const [selectedRadIds, setSelectedRadIds] = useState([])
  const [selectedDxIds, setSelectedDxIds] = useState([])
  const [selectedSurgIds, setSelectedSurgIds] = useState([])
  const [selectedRxIds, setSelectedRxIds] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [allergyName, setAllergyName] = useState('')
  const [labForm, setLabForm] = useState(emptyFileForm)
  const [radForm, setRadForm] = useState(emptyFileForm)
  const [dxForm, setDxForm] = useState(emptyDxForm)
  const [surgForm, setSurgForm] = useState(emptySurgForm)
  const [prescriptions, setPrescriptions] = useState([])
  const [prescriptionAuthor, setPrescriptionAuthor] = useState(activeRole)

  const patientId = patientIdProp || searchParams.get('id')
  const permissionsFor = (field) => getMedicalRecordPermissions(activeRole, field)
  const requirePermission = (field, action) => {
    if (canUseMedicalRecordAction(activeRole, field, action)) return true
    toast.error(`${activeRole} accounts cannot ${action} ${field} records`)
    return false
  }

  const today = () => new Date().toISOString().slice(0, 10)
  const fileInputClass = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#1D7FE8] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white'

  const formatDate = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (value?.toDate) return value.toDate().toISOString().slice(0, 10)
    return String(value)
  }

  const readSubcollection = async (firestoreId, name) => {
    const snapshot = await getDocs(collection(db, 'patients', firestoreId, name))
    return snapshot.docs
      .map((record) => ({ id: record.id, ...record.data() }))
      .filter((record) => record.id !== '_meta')
      .map((record) => ({ ...record, date: formatDate(record.date) }))
  }

  const loadPatientRecord = async () => {
    setLoading(true)
    try {
      const normalizedPatientId = String(patientId)
      let patientSnapshot = await getDocs(query(
        collection(db, 'patients'),
        where('nationalId', '==', normalizedPatientId)
      ))

      if (patientSnapshot.empty) {
        patientSnapshot = await getDocs(query(
          collection(db, 'patients'),
          where('national_id', '==', normalizedPatientId)
        ))
      }

      let loadedPatient = patientSnapshot.empty
        ? null
        : { id: patientSnapshot.docs[0].id, ...patientSnapshot.docs[0].data() }

      if (!loadedPatient) {
        const directSnapshot = await getDoc(doc(db, 'patients', normalizedPatientId))
        if (directSnapshot.exists()) {
          loadedPatient = { id: directSnapshot.id, ...directSnapshot.data() }
        }
      }

      if (!loadedPatient) {
        setPatient(null)
        return
      }

      loadedPatient.firestoreId = loadedPatient.id
      const rx = await readSubcollection(loadedPatient.id, 'prescriptions')
      const allergyRecords = await readSubcollection(loadedPatient.id, 'allergies')
      const labRecords = await readSubcollection(loadedPatient.id, 'lab')
      const radRecords = await readSubcollection(loadedPatient.id, 'radiology')
      const dxRecords = await readSubcollection(loadedPatient.id, 'diagnoses')
      const surgRecords = await readSubcollection(loadedPatient.id, 'surgeries')

      const withViewerLinks = (section, records) => records.map((record) => ({
        ...record,
        openFileFromFirebase: typeof window === 'undefined'
          ? record.openFileFromFirebase
          : `${window.location.origin}/file-viewer?patientId=${encodeURIComponent(loadedPatient.id)}&section=${encodeURIComponent(section)}&recordId=${encodeURIComponent(record.id)}`,
      }))

      setPatient(loadedPatient)
      setPrescriptions(rx)
      setAllergies(allergyRecords)
      setLabs(withViewerLinks('lab', labRecords))
      setRadiology(withViewerLinks('radiology', radRecords))
      setDiagnoses(dxRecords)
      setSurgeries(surgRecords)
    } catch (error) {
      console.error(error)
      toast.error('Could not load patient data from Firebase')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPatientRecord()
  }, [patientId])

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return

      const fallbackName = user.displayName?.trim() || user.email?.split('@')[0] || activeRole
      try {
        const profileSnapshot = await getDocs(query(
          collection(db, 'website_users'),
          where('uid', '==', user.uid)
        ))
        const profileName = profileSnapshot.docs[0]?.data()?.fullName?.trim()
        if (active) setPrescriptionAuthor(profileName || fallbackName)
      } catch (error) {
        console.error('Could not load prescription author profile:', error)
        if (active) setPrescriptionAuthor(fallbackName)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [activeRole])

  const displayedPrescriptionAuthor = (record) => {
    const savedAuthor = record?.doctor?.trim()
    return !savedAuthor || savedAuthor === 'Current Doctor' ? prescriptionAuthor : savedAuthor
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'rx', label: 'Prescriptions', icon: Pill },
    { id: 'wallet', label: 'Medical Wallet', icon: FileText },
  ]

  const toggleSelected = (selected, setSelected, id) => {
    setSelected(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id])
  }

  const resetSelection = (section) => {
    if (section === 'prescriptions') setSelectedRxIds([])
    if (section === 'allergies') setSelectedAllergies([])
    if (section === 'radiology') setSelectedRadIds([])
    if (section === 'diagnoses') setSelectedDxIds([])
    if (section === 'lab') setSelectedLabIds([])
    if (section === 'surgeries') setSelectedSurgIds([])
  }

  const cancelClear = (section) => {
    resetSelection(section)
    setDeleteMode(null)
  }

  const handleEditSection = (section) => {
    if (!requirePermission(section, 'edit')) return
    setDeleteMode(null)
    resetSelection(section)
    setEditMode((current) => current === section ? null : section)
  }

  const openRecordEditor = (section, record) => {
    if (!requirePermission(section, 'edit')) return
    if (editMode !== section) return
    setEditingRecord({ section, id: record.id, record })

    if (section === 'prescriptions') {
      const items = (record.items || []).map((item) => ({
        ...emptyRxItem,
        ...item,
        dosage: digitsOnly(item.dosage, 4),
        duration: digitsOnly(item.duration, 3),
      }))
      setRxItems(items.length > 0 ? items : [emptyRxItem])
      setPanel('rx')
    } else if (section === 'allergies') {
      setAllergyName(record.name || '')
      setPanel('allergy')
    } else if (section === 'diagnoses') {
      setDxForm({ name: record.name || '', date: formatDate(record.date) })
      setPanel('dx')
    } else if (section === 'surgeries') {
      setSurgForm({
        name: record.name || '',
        date: formatDate(record.date),
        surgeon: record.surgeon === 'N/A' ? '' : (record.surgeon || ''),
        hospital: record.hospital === 'N/A' ? '' : (record.hospital || ''),
        notes: record.notes || '',
      })
      setPanel('surgery')
    } else {
      const setForm = section === 'lab' ? setLabForm : setRadForm
      setForm({
        ...emptyFileForm,
        type: record.type || '',
        labName: record.labName || '',
        date: formatDate(record.date),
        fileName: record.fileName || '',
        fileUrl: record.openFileFromFirebase || '',
        fileType: record.fileType || '',
      })
      setPanel(section === 'lab' ? 'lab' : 'rad')
    }
  }

  const closeEditor = () => {
    setPanel(null)
    setEditingRecord(null)
    setEditMode(null)
  }

  const handleClearSection = (section, selected, label) => {
    if (!requirePermission(section, 'delete')) return
    if (deleteMode !== section) {
      setEditMode(null)
      setDeleteMode(section)
      return
    }
    if (selected.length === 0) {
      toast.error(`Select ${label} to delete`)
      return
    }
    setPendingDelete({ section, selected, label })
  }

  const sectionMap = {
    prescriptions: { collectionName: 'prescriptions', setRecords: setPrescriptions },
    allergies: { collectionName: 'allergies', setRecords: setAllergies },
    radiology: { collectionName: 'radiology', setRecords: setRadiology },
    diagnoses: { collectionName: 'diagnoses', setRecords: setDiagnoses },
    lab: { collectionName: 'lab', setRecords: setLabs },
    surgeries: { collectionName: 'surgeries', setRecords: setSurgeries },
  }

  const confirmDelete = async () => {
    if (!pendingDelete || !patient?.firestoreId) return
    const { section, selected, label } = pendingDelete
    if (!requirePermission(section, 'delete')) {
      setPendingDelete(null)
      return
    }
    const target = sectionMap[section]

    try {
      await Promise.all(selected.map(async (id) => {
        if (['lab', 'radiology'].includes(section)) {
          const chunksSnapshot = await getDocs(collection(db, 'patients', patient.firestoreId, target.collectionName, id, 'fileChunks'))
          await Promise.all(chunksSnapshot.docs.map((chunkDoc) => deleteDoc(chunkDoc.ref)))
        }
        await deleteDoc(doc(db, 'patients', patient.firestoreId, target.collectionName, id))
      }))
      target.setRecords((records) => records.filter((record) => !selected.includes(record.id)))
      resetSelection(section)
      setDeleteMode(null)
      setPendingDelete(null)
      toast.success(`${label} removed from Firebase`)
    } catch (error) {
      console.error(error)
      toast.error('Could not delete selected records')
    }
  }

  const addPatientRecord = async (collectionName, data, setRecords) => {
    const recordRef = await addDoc(collection(db, 'patients', patient.firestoreId, collectionName), {
      ...data,
      patientId: patient.firestoreId,
      nationalId: patient.nationalId,
      createdAt: serverTimestamp(),
    })
    const record = { id: recordRef.id, ...data, patientId: patient.firestoreId, nationalId: patient.nationalId }
    setRecords((records) => [record, ...records])
    return record
  }

  const updatePatientRecord = async (section, id, data, setRecords) => {
    await updateDoc(doc(db, 'patients', patient.firestoreId, section, id), {
      ...data,
      updatedAt: serverTimestamp(),
    })
    setRecords((records) => records.map((record) => record.id === id ? { ...record, ...data } : record))
  }

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('Could not read selected file'))
    reader.readAsDataURL(file)
  })

  const compressImageForFirestore = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return resolve(file)

    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      const maxSide = 1200
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Could not compress image'))
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.72)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image for compression'))
    }

    image.src = objectUrl
  })

  const createFirestoreFile = async (file) => {
    if (!file) return {}
    const storedFile = await compressImageForFirestore(file)
    const fileDataUrl = await readFileAsDataUrl(storedFile)
    const fileBase64 = String(fileDataUrl).split(',')[1] || ''

    if (fileBase64.length > firestoreInlineFileMaxBase64Length) {
      throw new Error('This file is too large for Firestore without file chunks. Please upload a smaller PDF or image.')
    }

    return {
      fileName: storedFile.name,
      fileType: storedFile.type || 'application/octet-stream',
      fileSize: storedFile.size,
      fileBase64,
      storageStatus: 'saved',
    }
  }

  const handleAddPrescription = async () => {
    const prescriptionAction = editingRecord?.section === 'prescriptions' ? 'edit' : 'add'
    if (!requirePermission('prescriptions', prescriptionAction)) return
    if (rxItems.some((item) => item.name.trim().length > 20)) return toast.error('Medication name must be 20 characters or less')
    if (rxItems.some((item) => String(item.dosage || '').replace(/\D/g, '').length > 4)) return toast.error('Dosage must be maximum 4 digits in mg')
    if (rxItems.some((item) => String(item.duration || '').replace(/\D/g, '').length > 3)) return toast.error('Duration must be maximum 3 digits in days')
    if (rxItems.some((item) => item.notes.length > 35)) return toast.error('Patient notes must be 35 characters or less')

    const validItems = rxItems
      .filter((item) => item.name.trim())
      .map((item) => ({
        ...item,
        name: item.name.trim().slice(0, 20),
        dosage: formatNumberUnit(item.dosage, 'mg'),
        duration: formatNumberUnit(item.duration, 'days'),
        notes: item.notes.trim().slice(0, 35),
      }))
    if (validItems.length === 0) return toast.error('Add at least one medication')

    setSaving(true)
    setUploadProgress(null)
    try {
      const data = {
        items: validItems,
        doctor: displayedPrescriptionAuthor(editingRecord?.record),
        authorRole: editingRecord?.record?.authorRole || activeRole,
        date: editingRecord?.record?.date || today(),
        status: editingRecord?.record?.status || 'Active',
      }
      if (editingRecord?.section === 'prescriptions') {
        await updatePatientRecord('prescriptions', editingRecord.id, data, setPrescriptions)
      } else {
        await addPatientRecord('prescriptions', data, setPrescriptions)
      }
      toast.success(`Prescription ${editingRecord ? 'updated' : 'saved'} in Firebase`)
      closeEditor()
      setRxItems([emptyRxItem])
    } catch (error) {
      console.error(error)
      toast.error('Could not save prescription')
    } finally {
      setSaving(false)
    }
  }

  const handleAddAllergy = async () => {
    const allergyAction = editingRecord?.section === 'allergies' ? 'edit' : 'add'
    if (!requirePermission('allergies', allergyAction)) return
    if (!allergyName.trim()) return toast.error('Allergy name is required')
    if (!/^[a-zA-Z\s'-]+$/.test(allergyName.trim())) return toast.error('Allergy name can contain letters only')
    if (allergyName.trim().length > allergyNameMaxLength) return toast.error(`Allergy name must be ${allergyNameMaxLength} characters or less`)
    setSaving(true)
    try {
      const data = { name: allergyName.trim(), date: editingRecord?.record?.date || today() }
      if (editingRecord?.section === 'allergies') {
        await updatePatientRecord('allergies', editingRecord.id, data, setAllergies)
      } else {
        await addPatientRecord('allergies', data, setAllergies)
      }
      toast.success(`Allergy ${editingRecord ? 'updated' : 'saved'} in Firebase`)
      closeEditor()
      setAllergyName('')
    } catch (error) {
      console.error(error)
      toast.error('Could not save allergy')
    } finally {
      setSaving(false)
    }
  }

  const handleAddDiagnosis = async () => {
    const diagnosisAction = editingRecord?.section === 'diagnoses' ? 'edit' : 'add'
    if (!requirePermission('diagnoses', diagnosisAction)) return
    if (!dxForm.name.trim()) return toast.error('Diagnosis is required')
    if (dxForm.name.trim().length > diagnosisNameMaxLength) return toast.error(`Diagnosis must be ${diagnosisNameMaxLength} characters or less`)
    setSaving(true)
    try {
      const data = {
        ...dxForm,
        name: dxForm.name.trim(),
        date: dxForm.date || today(),
        doctor: displayedPrescriptionAuthor(editingRecord?.record),
        authorRole: editingRecord?.record?.authorRole || activeRole,
      }
      if (editingRecord?.section === 'diagnoses') {
        await updatePatientRecord('diagnoses', editingRecord.id, data, setDiagnoses)
      } else {
        await addPatientRecord('diagnoses', data, setDiagnoses)
      }
      toast.success(`Diagnosis ${editingRecord ? 'updated' : 'saved'} in Firebase`)
      closeEditor()
      setDxForm(emptyDxForm)
    } catch (error) {
      console.error(error)
      toast.error('Could not save diagnosis')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSurgery = async () => {
    const surgeryAction = editingRecord?.section === 'surgeries' ? 'edit' : 'add'
    if (!requirePermission('surgeries', surgeryAction)) return
    if (!surgForm.name.trim()) return toast.error('Surgery name is required')
    if (!/^[a-zA-Z\s'-]+$/.test(surgForm.name.trim())) return toast.error('Surgery name can contain letters only')
    if (surgForm.name.trim().length > surgeryTextMaxLength) return toast.error(`Surgery name must be ${surgeryTextMaxLength} characters or less`)
    if (surgForm.surgeon.trim() && !/^[a-zA-Z\s'-]+$/.test(surgForm.surgeon.trim())) return toast.error('Surgeon name can contain letters only')
    if (surgForm.surgeon.trim().length > surgeryTextMaxLength) return toast.error(`Surgeon name must be ${surgeryTextMaxLength} characters or less`)
    if (surgForm.hospital.trim() && !/^[a-zA-Z\s'-]+$/.test(surgForm.hospital.trim())) return toast.error('Hospital name can contain letters only')
    if (surgForm.hospital.trim().length > surgeryTextMaxLength) return toast.error(`Hospital name must be ${surgeryTextMaxLength} characters or less`)
    if (surgForm.notes.trim().length > surgeryNotesMaxLength) return toast.error(`Notes must be ${surgeryNotesMaxLength} characters or less`)
    setSaving(true)
    try {
      const data = {
        ...surgForm,
        name: surgForm.name.trim(),
        date: surgForm.date || today(),
        surgeon: surgForm.surgeon || 'N/A',
        hospital: surgForm.hospital || 'N/A',
      }
      if (editingRecord?.section === 'surgeries') {
        await updatePatientRecord('surgeries', editingRecord.id, data, setSurgeries)
      } else {
        await addPatientRecord('surgeries', data, setSurgeries)
      }
      toast.success(`Surgery ${editingRecord ? 'updated' : 'saved'} in Firebase`)
      closeEditor()
      setSurgForm(emptySurgForm)
    } catch (error) {
      console.error(error)
      toast.error('Could not save surgery')
    } finally {
      setSaving(false)
    }
  }

  const handleAddFileRecord = async (section, form, setForm, setRecords) => {
    const fileAction = editingRecord?.section === section ? 'edit' : 'add'
    if (!requirePermission(section, fileAction)) return
    if (!form.type.trim()) return toast.error('Type is required')
    if (form.type.trim().length > fileRecordTypeMaxLength) return toast.error('Type must be 20 characters or less')
    if (form.labName.trim().length > fileRecordLabNameMaxLength) return toast.error('Lab name must be 25 characters or less')
    if (form.labName.trim() && !/^[a-zA-Z\s'-]+$/.test(form.labName.trim())) return toast.error('Lab name can contain letters only')
    const isEditing = editingRecord?.section === section
    if (!form.file && !isEditing) return toast.error(`Upload a file before adding a ${section === 'lab' ? 'lab' : 'radiology'} record`)
    setSaving(true)
    try {
      let fileData = {}
      if (form.file) {
        setUploadProgress(10)
        fileData = await createFirestoreFile(form.file)
        setUploadProgress(70)
      }
      const data = {
        type: form.type.trim(),
        labName: form.labName.trim(),
        date: form.date || today(),
        ...fileData,
      }
      const record = isEditing
        ? { id: editingRecord.id, ...data }
        : await addPatientRecord(section, data, setRecords)
      if (isEditing) {
        await updatePatientRecord(section, editingRecord.id, data, setRecords)
      }
      if (form.file && !isEditing) {
        const viewerPath = `/file-viewer?patientId=${encodeURIComponent(patient.firestoreId)}&section=${encodeURIComponent(section)}&recordId=${encodeURIComponent(record.id)}`
        const viewerUrl = `${window.location.origin}${viewerPath}`
        await updateDoc(doc(db, 'patients', patient.firestoreId, section, record.id), {
          storageStatus: 'saved',
          openFileFromFirebase: viewerUrl,
        })
        setRecords((records) => records.map((item) => item.id === record.id ? { ...item, ...fileData, storageStatus: 'saved', openFileFromFirebase: viewerUrl } : item))
      }
      toast.success(`${section === 'lab' ? 'Lab' : 'Radiology'} record ${isEditing ? 'updated' : 'saved'} in Firebase`)
      closeEditor()
      setForm(emptyFileForm)
    } catch (error) {
      console.error(error)
      toast.error(error?.message || `Could not save ${section} record`)
    } finally {
      setSaving(false)
      setUploadProgress(null)
    }
  }

  const backControl = onBack ? (
    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
      <ArrowLeft className="w-4 h-4" /> Back to search
    </button>
  ) : (
    <Link href={backHref} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
      <ArrowLeft className="w-4 h-4" /> Back to search
    </Link>
  )

  if (loading) {
    return <MedicoLoadingScreen />
  }

  if (!patient) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-2xl font-display mb-2">Patient not found</div>
        {onBack ? (
          <button onClick={onBack} className="text-[#1D7FE8]">Back to search</button>
        ) : (
          <Link href={backHref} className="text-[#1D7FE8]">Back to search</Link>
        )}
      </div>
    </div>
  )

  const activity = [
    ...prescriptions.map(r => ({ date: r.date, type: 'Prescription', title: r.items?.map(i => i.name).join(', ') || 'Prescription' })),
    ...labs.map(l => ({ date: l.date, type: 'Lab', title: l.type })),
    ...radiology.map(r => ({ date: r.date, type: 'Radiology', title: r.type })),
    ...diagnoses.map(d => ({ date: d.date, type: 'Diagnosis', title: d.name })),
    ...surgeries.map(s => ({ date: s.date, type: 'Surgery', title: s.name })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5)

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">{backControl}</div>

        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-3 space-y-4">
            <PatientSummaryCard patient={patient} />
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div>
                <div className="text-xs text-slate-400 mb-2">Contact</div>
                <div className="space-y-2">
                  <div className="font-mono text-xs break-all">{patient.phone || 'N/A'}</div>
                  <div className="text-xs text-slate-400 break-all">{patient.email || 'N/A'}</div>
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="text-xs text-slate-400 mb-3">Emergency Contact</div>
                {patient.emergencyContact?.name || patient.emergencyContact?.number ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">Full Name</div>
                      <div className="mt-1 text-sm font-medium">{patient.emergencyContact?.name || 'N/A'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">Number</div>
                        <div className="mt-1 font-mono text-xs break-all">{patient.emergencyContact?.number || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">Relationship</div>
                        <div className="mt-1 text-xs">{patient.emergencyContact?.relationship || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Not provided</div>
                )}
              </div>
            </div>
          </aside>

          <main className="col-span-9">
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
              {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition ${tab === t.id ? 'bg-[#1D7FE8] text-white' : 'text-slate-400 hover:text-white'}`}><t.icon className="w-3.5 h-3.5" />{t.label}</button>)}
            </div>

            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Prescriptions', value: prescriptions.length, color: '#1D7FE8' },
                      { label: 'Lab Records', value: labs.length, color: '#10B981' },
                      { label: 'Radiology', value: radiology.length, color: '#F59E0B' },
                      { label: 'Diagnoses', value: diagnoses.length, color: '#EF4444' },
                    ].map(item => (
                      <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <div className="text-3xl font-display font-bold" style={{ color: item.color }}>{item.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="font-display font-semibold mb-3">Recent Activity</div>
                    {activity.length > 0 ? (
                      <div className="space-y-2">
                        {activity.map((item, idx) => (
                          <div key={`${item.type}-${item.date}-${idx}`} className="flex items-center gap-3 text-sm py-2 border-b border-white/5 last:border-0">
                            <span className="text-xs font-mono text-slate-400 w-24">{item.date}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1D7FE8]/15 text-[#1D7FE8]">{item.type}</span>
                            <span className="flex-1">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : <EmptyState message="No Firebase records yet" />}
                  </div>
                </div>
              )}

              {tab === 'rx' && (
                <WalletSection
                  title="Prescriptions"
                  section="prescriptions"
                  permissions={permissionsFor('prescriptions')}
                  selected={selectedRxIds}
                  onClear={() => handleClearSection('prescriptions', selectedRxIds, 'prescriptions')}
                  deleteMode={deleteMode}
                  editMode={editMode}
                  onEdit={() => handleEditSection('prescriptions')}
                  onCancel={() => cancelClear('prescriptions')}
                  onAdd={() => { setEditingRecord(null); setDeleteMode(null); setEditMode(null); setSelectedRxIds([]); setRxItems([emptyRxItem]); setPanel('rx') }}
                >
                  {prescriptions.length === 0 && <EmptyState message="No prescriptions yet" />}
                  <div className="space-y-3">
                    {prescriptions.map(rx => (
                    <details
                      key={rx.id}
                      onClick={(event) => {
                        if (editMode === 'prescriptions') {
                          event.preventDefault()
                          openRecordEditor('prescriptions', rx)
                        } else if (deleteMode === 'prescriptions') {
                          event.preventDefault()
                          toggleSelected(selectedRxIds, setSelectedRxIds, rx.id)
                        }
                      }}
                      className={`bg-white/5 border rounded-xl group ${editMode === 'prescriptions' ? 'cursor-pointer border-amber-400/70' : selectedRxIds.includes(rx.id) ? 'cursor-pointer border-red-400' : deleteMode === 'prescriptions' ? 'cursor-pointer border-white/10' : 'border-white/10'}`}
                    >
                      <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                        <div className="flex items-center gap-3">
                          <Pill className="w-5 h-5 text-[#1D7FE8]" />
                          <div>
                            {editMode === 'prescriptions' && <div className="mb-1 text-xs text-amber-300"><Pencil className="mr-1 inline h-3 w-3" /> Click to edit</div>}
                            {deleteMode === 'prescriptions' && <div className="mb-1 text-xs text-red-300 font-mono">{selectedRxIds.includes(rx.id) ? '[x] selected' : '[ ] select'}</div>}
                            <div className="font-medium">{rx.items?.length || 0} medication{rx.items?.length === 1 ? '' : 's'} - {displayedPrescriptionAuthor(rx)}</div>
                            <div className="text-xs text-slate-400 font-mono">{rx.date}</div>
                          </div>
                        </div>
                        <StatusBadge status={rx.status || 'Active'} />
                      </summary>
                      <div className="px-4 pb-4 space-y-2">
                        {(rx.items || []).map((i, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3 grid grid-cols-4 gap-3 text-sm">
                            <div><div className="text-xs text-slate-400">Medication</div><div className="font-medium">{i.name}</div></div>
                            <div><div className="text-xs text-slate-400">Dosage</div><div className="font-mono">{i.dosage}</div></div>
                            <div><div className="text-xs text-slate-400">Frequency</div><div>{i.frequency}</div></div>
                            <div><div className="text-xs text-slate-400">Duration</div><div>{i.duration}</div></div>
                            {i.notes && (
                              <div className="col-span-4 border-t border-white/10 pt-3">
                                <div className="text-xs text-slate-400">Notes</div>
                                <div className="mt-0.5 whitespace-pre-wrap break-words">{i.notes}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                    ))}
                  </div>
                </WalletSection>
              )}

              {tab === 'wallet' && (
                <div className="space-y-4">
                  <WalletSection title="Allergies" section="allergies" permissions={permissionsFor('allergies')} selected={selectedAllergies} onClear={() => handleClearSection('allergies', selectedAllergies, 'allergies')} deleteMode={deleteMode} editMode={editMode} onEdit={() => handleEditSection('allergies')} onCancel={() => cancelClear('allergies')} onAdd={() => { setEditingRecord(null); setAllergyName(''); setPanel('allergy') }}>
                    {allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {allergies.map(allergy => (
                          <button key={allergy.id} onClick={() => editMode === 'allergies' ? openRecordEditor('allergies', allergy) : deleteMode === 'allergies' && toggleSelected(selectedAllergies, setSelectedAllergies, allergy.id)} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${editMode === 'allergies' ? 'cursor-pointer border-amber-400 bg-amber-500/15 text-amber-300' : selectedAllergies.includes(allergy.id) ? 'bg-red-500/30 text-white border-red-400' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                            {deleteMode === 'allergies' && <span className="font-mono">{selectedAllergies.includes(allergy.id) ? '[x]' : '[ ]'}</span>}
                            {allergy.name}
                          </button>
                        ))}
                      </div>
                    ) : <EmptyState message="No allergies recorded" />}
                  </WalletSection>

                  <WalletSection title="Radiology" section="radiology" permissions={permissionsFor('radiology')} selected={selectedRadIds} onClear={() => handleClearSection('radiology', selectedRadIds, 'radiology records')} deleteMode={deleteMode} editMode={editMode} onEdit={() => handleEditSection('radiology')} onCancel={() => cancelClear('radiology')} onAdd={() => { setEditingRecord(null); setRadForm(emptyFileForm); setPanel('rad') }}>
                    {radiology.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {radiology.map(r => <FileRecordCard key={r.id} record={r} selected={selectedRadIds.includes(r.id)} selecting={deleteMode === 'radiology'} editing={editMode === 'radiology'} onSelect={() => toggleSelected(selectedRadIds, setSelectedRadIds, r.id)} onEdit={() => openRecordEditor('radiology', r)} />)}
                      </div>
                    ) : <EmptyState message="No radiology records" />}
                  </WalletSection>

                  <WalletSection title="Diagnoses" section="diagnoses" permissions={permissionsFor('diagnoses')} selected={selectedDxIds} onClear={() => handleClearSection('diagnoses', selectedDxIds, 'diagnoses')} deleteMode={deleteMode} editMode={editMode} onEdit={() => handleEditSection('diagnoses')} onCancel={() => cancelClear('diagnoses')} onAdd={() => { setEditingRecord(null); setDxForm(emptyDxForm); setPanel('dx') }}>
                    {diagnoses.length > 0 ? (
                      <div className="space-y-3">
                        {diagnoses.map(d => (
                          <SimpleRecord key={d.id} selected={selectedDxIds.includes(d.id)} selecting={deleteMode === 'diagnoses'} editing={editMode === 'diagnoses'} onSelect={() => toggleSelected(selectedDxIds, setSelectedDxIds, d.id)} onEdit={() => openRecordEditor('diagnoses', d)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-medium">{d.name}</div>
                              <div className="text-xs text-slate-400 font-mono">{d.date}</div>
                            </div>
                          </SimpleRecord>
                        ))}
                      </div>
                    ) : <EmptyState message="No diagnoses recorded" />}
                  </WalletSection>

                  <WalletSection title="Lab" section="lab" permissions={permissionsFor('lab')} selected={selectedLabIds} onClear={() => handleClearSection('lab', selectedLabIds, 'lab records')} deleteMode={deleteMode} editMode={editMode} onEdit={() => handleEditSection('lab')} onCancel={() => cancelClear('lab')} onAdd={() => { setEditingRecord(null); setLabForm(emptyFileForm); setPanel('lab') }}>
                    {labs.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {labs.map(l => <FileRecordCard key={l.id} record={l} selected={selectedLabIds.includes(l.id)} selecting={deleteMode === 'lab'} editing={editMode === 'lab'} onSelect={() => toggleSelected(selectedLabIds, setSelectedLabIds, l.id)} onEdit={() => openRecordEditor('lab', l)} />)}
                      </div>
                    ) : <EmptyState message="No lab records" />}
                  </WalletSection>

                  <WalletSection title="Surgeries" section="surgeries" permissions={permissionsFor('surgeries')} selected={selectedSurgIds} onClear={() => handleClearSection('surgeries', selectedSurgIds, 'surgeries')} deleteMode={deleteMode} editMode={editMode} onEdit={() => handleEditSection('surgeries')} onCancel={() => cancelClear('surgeries')} onAdd={() => { setEditingRecord(null); setSurgForm(emptySurgForm); setPanel('surgery') }}>
                    {surgeries.length > 0 ? (
                      <div className="space-y-3">
                        {surgeries.map(s => (
                          <SimpleRecord key={s.id} selected={selectedSurgIds.includes(s.id)} selecting={deleteMode === 'surgeries'} editing={editMode === 'surgeries'} onSelect={() => toggleSelected(selectedSurgIds, setSelectedSurgIds, s.id)} onEdit={() => openRecordEditor('surgeries', s)}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium">{s.name}</div>
                                <div className="text-xs text-slate-400 mt-1">{s.hospital}</div>
                                <div className="text-xs text-slate-400 mt-1">Surgeon: {s.surgeon}</div>
                              </div>
                              <div className="text-xs text-slate-400 font-mono">{s.date}</div>
                            </div>
                            {s.notes && <div className="text-sm text-slate-300 bg-white/5 rounded-lg p-3 mt-3">{s.notes}</div>}
                          </SimpleRecord>
                        ))}
                      </div>
                    ) : <EmptyState message="No surgeries recorded" />}
                  </WalletSection>
                </div>
              )}
            </motion.div>
          </main>
        </div>
      </div>

      <SlideOverPanel open={panel === 'rx'} onClose={closeEditor} title={editingRecord ? 'Edit Prescription' : 'New Prescription'}>
        <div className="space-y-4">
          {rxItems.map((it, idx) => (
            <div key={idx} className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">Medication {idx + 1}</div>
                {rxItems.length > 1 && <button onClick={() => setRxItems(rxItems.filter((_, i) => i !== idx))} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
              <input maxLength={20} value={it.name} onChange={e => setRxItems(rxItems.map((x, i) => i === idx ? { ...x, name: e.target.value.slice(0, 20) } : x))} placeholder="Medication name" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D7FE8]" />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input inputMode="numeric" maxLength={4} value={digitsOnly(it.dosage, 4)} onChange={e => setRxItems(rxItems.map((x, i) => i === idx ? { ...x, dosage: digitsOnly(e.target.value, 4) } : x))} placeholder="Dosage" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-[#1D7FE8]" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">mg</span>
                </div>
                <select value={it.frequency} onChange={e => setRxItems(rxItems.map((x, i) => i === idx ? { ...x, frequency: e.target.value } : x))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D7FE8]">
                  <option className="bg-[#0F1E36]">Once daily</option><option className="bg-[#0F1E36]">Twice daily</option><option className="bg-[#0F1E36]">Three times daily</option><option className="bg-[#0F1E36]">As needed</option>
                </select>
              </div>
              <div className="relative">
                <input inputMode="numeric" maxLength={3} value={digitsOnly(it.duration, 3)} onChange={e => setRxItems(rxItems.map((x, i) => i === idx ? { ...x, duration: digitsOnly(e.target.value, 3) } : x))} placeholder="Duration" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-14 text-sm outline-none focus:border-[#1D7FE8]" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">days</span>
              </div>
              <textarea maxLength={35} value={it.notes} onChange={e => setRxItems(rxItems.map((x, i) => i === idx ? { ...x, notes: e.target.value.slice(0, 35) } : x))} placeholder="Notes for patient" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1D7FE8]" rows={2} />
            </div>
          ))}
          <button onClick={() => setRxItems([...rxItems, emptyRxItem])} className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-sm flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Medication Item</button>
          <button disabled={saving} onClick={handleAddPrescription} className="w-full py-3 rounded-lg bg-gradient-to-r from-[#1D7FE8] to-[#10B981] font-medium text-sm disabled:opacity-60">{saving ? 'Saving...' : editingRecord ? 'Save Changes' : 'Submit Prescription'}</button>
        </div>
      </SlideOverPanel>

      <SlideOverPanel open={panel === 'allergy'} onClose={closeEditor} title={editingRecord ? 'Edit Allergy' : 'Add Allergy'}>
        <div className="space-y-3">
          <TextInput label="Allergy Name" value={allergyName} onChange={(value) => setAllergyName(allergyLettersOnly(value))} placeholder="e.g., Latex" maxLength={allergyNameMaxLength} />
          <PrimaryButton disabled={saving} onClick={handleAddAllergy}>{saving ? 'Saving...' : editingRecord ? 'Save Changes' : 'Add Allergy'}</PrimaryButton>
        </div>
      </SlideOverPanel>

      <SlideOverPanel open={panel === 'dx'} onClose={closeEditor} title={editingRecord ? 'Edit Diagnosis' : 'Add Diagnosis'}>
        <div className="space-y-3">
          <TextInput label="Diagnosis" value={dxForm.name} onChange={(value) => setDxForm({ ...dxForm, name: value.slice(0, diagnosisNameMaxLength) })} placeholder="e.g., Essential Hypertension" maxLength={diagnosisNameMaxLength} />
          <TextInput label="Date" type="date" value={dxForm.date} onChange={(value) => setDxForm({ ...dxForm, date: value })} />
          <PrimaryButton disabled={saving} onClick={handleAddDiagnosis}>{saving ? 'Saving...' : editingRecord ? 'Save Changes' : 'Add Diagnosis'}</PrimaryButton>
        </div>
      </SlideOverPanel>

      <SlideOverPanel open={panel === 'surgery'} onClose={closeEditor} title={editingRecord ? 'Edit Surgery' : 'Add Surgery'}>
        <div className="space-y-3">
          <TextInput label="Surgery Name" value={surgForm.name} onChange={(value) => setSurgForm({ ...surgForm, name: surgeryLettersOnly(value) })} placeholder="e.g., Appendectomy" maxLength={surgeryTextMaxLength} />
          <TextInput label="Date" type="date" value={surgForm.date} onChange={(value) => setSurgForm({ ...surgForm, date: value })} />
          <TextInput label="Surgeon" value={surgForm.surgeon} onChange={(value) => setSurgForm({ ...surgForm, surgeon: surgeryLettersOnly(value) })} placeholder="Surgeon name" maxLength={surgeryTextMaxLength} />
          <TextInput label="Hospital" value={surgForm.hospital} onChange={(value) => setSurgForm({ ...surgForm, hospital: surgeryLettersOnly(value) })} placeholder="Hospital name" maxLength={surgeryTextMaxLength} />
          <div><label className="text-xs text-slate-400 mb-1 block">Notes</label><textarea maxLength={surgeryNotesMaxLength} value={surgForm.notes} onChange={e => setSurgForm({ ...surgForm, notes: e.target.value.slice(0, surgeryNotesMaxLength) })} rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Surgery notes..." /></div>
          <PrimaryButton disabled={saving} onClick={handleAddSurgery}>{saving ? 'Saving...' : editingRecord ? 'Save Changes' : 'Add Surgery'}</PrimaryButton>
        </div>
      </SlideOverPanel>

      <FileRecordPanel open={panel === 'lab'} title={editingRecord ? 'Edit Lab Record' : 'Add Lab Record'} form={labForm} setForm={setLabForm} fileInputClass={fileInputClass} saving={saving} uploadProgress={uploadProgress} onClose={() => !saving && closeEditor()} onSubmit={() => handleAddFileRecord('lab', labForm, setLabForm, setLabs)} submitLabel={editingRecord ? 'Save Changes' : 'Add Lab Record'} fileOptional={Boolean(editingRecord)} />
      <FileRecordPanel open={panel === 'rad'} title={editingRecord ? 'Edit Radiology Record' : 'Add Radiology Record'} form={radForm} setForm={setRadForm} fileInputClass={fileInputClass} saving={saving} uploadProgress={uploadProgress} onClose={() => !saving && closeEditor()} onSubmit={() => handleAddFileRecord('radiology', radForm, setRadForm, setRadiology)} submitLabel={editingRecord ? 'Save Changes' : 'Add Radiology Record'} typePlaceholder="e.g., Chest X-Ray, Brain MRI" fileOptional={Boolean(editingRecord)} />

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete selected records?"
        body={`Are you sure you want to delete the selected ${pendingDelete?.label || 'records'} from Firebase?`}
        confirmLabel="Delete"
      />
    </div>
  )
}

const WalletSection = ({ title, deleteMode, editMode, section, permissions = { add: true, edit: true, delete: true }, onClear, onEdit, onCancel, onAdd, children }) => (
  <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="font-display font-semibold">{title}</div>
      <div className="flex items-center gap-2">
        {permissions.delete && <button onClick={onClear} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${deleteMode === section ? 'bg-red-500/20 text-red-300' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'}`}><Trash2 className="w-3.5 h-3.5" /> Clear</button>}
        {permissions.edit && <button onClick={onEdit} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${editMode === section ? 'bg-amber-500/25 text-amber-200' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'}`}><Pencil className="w-3.5 h-3.5" /> Edit</button>}
        {permissions.delete && deleteMode === section && <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium">Cancel</button>}
        {permissions.add && <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D7FE8]/15 hover:bg-[#1D7FE8]/25 text-[#1D7FE8] text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Add</button>}
      </div>
    </div>
    {children}
  </section>
)

const SimpleRecord = ({ selected, selecting, editing, onSelect, onEdit, children }) => (
  <div onClick={() => editing ? onEdit?.() : selecting && onSelect()} className={`bg-white/5 border rounded-xl p-4 ${editing ? 'border-amber-400/70' : selected ? 'border-red-400' : 'border-white/10'} ${selecting || editing ? 'cursor-pointer' : ''}`}>
    {selecting && <div className="text-xs text-red-300 mb-2 font-mono">{selected ? '[x] selected' : '[ ] select'}</div>}
    {editing && <div className="text-xs text-amber-300 mb-2"><Pencil className="mr-1 inline h-3 w-3" /> Click to edit</div>}
    {children}
  </div>
)

const FileRecordCard = ({ record, selected, selecting, editing, onSelect, onEdit, icon }) => {
  const viewerUrl = record.openFileFromFirebase

  return (
  <SimpleRecord selected={selected} selecting={selecting} editing={editing} onSelect={onSelect} onEdit={onEdit}>
    {icon && <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg mb-3 flex items-center justify-center">{icon}</div>}
    <div className="font-medium text-sm mb-1">{record.type}</div>
    {record.labName && <div className="text-xs text-slate-400 mb-2">{record.labName}</div>}
    <div className="text-xs text-slate-400 font-mono">{record.date}</div>
    {viewerUrl && (
      <a href={viewerUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#1D7FE8] hover:text-white">
        <FileText className="w-3.5 h-3.5" /> {record.fileName || 'Open file'}
      </a>
    )}
  </SimpleRecord>
  )
}

const TextInput = ({ label, value, onChange, placeholder = '', type = 'text', maxLength }) => (
  <div>
    <label className="text-xs text-slate-400 mb-1 block">{label}</label>
    <input type={type} maxLength={maxLength} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder={placeholder} />
  </div>
)

const PrimaryButton = ({ children, disabled, onClick }) => (
  <button disabled={disabled} onClick={onClick} className="w-full py-3 rounded-lg bg-gradient-to-r from-[#1D7FE8] to-[#10B981] font-medium text-sm disabled:opacity-60">{children}</button>
)

const FileRecordPanel = ({ open, title, form, setForm, fileInputClass, saving, uploadProgress, onClose, onSubmit, submitLabel, fileOptional = false, typePlaceholder = 'e.g., CBC, HbA1c, Lipid Panel' }) => (
  <SlideOverPanel open={open} onClose={onClose} title={title}>
    <div className="space-y-3">
      <TextInput label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value.slice(0, fileRecordTypeMaxLength) })} placeholder={typePlaceholder} maxLength={fileRecordTypeMaxLength} />
      <TextInput label="Lab Name" value={form.labName} onChange={(value) => setForm({ ...form, labName: fileRecordLabNameOnly(value) })} placeholder="e.g., King Fahd Medical Lab" maxLength={fileRecordLabNameMaxLength} />
      <TextInput label="Date" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
      <div>
        <label className="text-xs text-slate-400 mb-1 block">File {fileOptional && <span className="text-slate-500">(optional — keep the current file)</span>}</label>
        <input type="file" accept="application/pdf,image/*" onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          setForm({ ...form, file, fileName: file.name, fileType: file.type })
        }} className={fileInputClass} />
      </div>
      {form.fileName && <div className="text-xs text-slate-400">Selected: {form.fileName}</div>}
      {saving && uploadProgress !== null && (
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#1D7FE8] to-[#10B981]" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}
      <PrimaryButton disabled={saving} onClick={onSubmit}>{saving ? (uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Saving to Firebase...') : submitLabel}</PrimaryButton>
    </div>
  </SlideOverPanel>
)
