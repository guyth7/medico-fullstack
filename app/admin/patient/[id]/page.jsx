'use client'

import PatientDetail from '@/app/doctor/patient/[id]/page'

export default function AdminPatientDetail() {
  return <PatientDetail activeRole="Admin" backHref="/admin" />
}
