'use client'
import { FlaskConical } from 'lucide-react'
import PatientRecordLookup from '@/components/medi/PatientRecordLookup'

export default function LaboratoryPage() {
  return <PatientRecordLookup role="Laboratory" roleColor="#8B5CF6" icon={FlaskConical} basePath="/laboratory" />
}
