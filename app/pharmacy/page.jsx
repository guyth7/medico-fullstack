'use client'
import { Pill } from 'lucide-react'
import PatientRecordLookup from '@/components/medi/PatientRecordLookup'

export default function PharmacyPage() {
  return <PatientRecordLookup role="Pharmacy" roleColor="#F59E0B" icon={Pill} basePath="/pharmacy" />
}
