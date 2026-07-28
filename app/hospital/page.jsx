'use client'
import { Hospital } from 'lucide-react'
import PatientRecordLookup from '@/components/medi/PatientRecordLookup'

export default function HospitalPage() {
  return <PatientRecordLookup role="Hospital" roleColor="#EF4444" icon={Hospital} basePath="/hospital" />
}
