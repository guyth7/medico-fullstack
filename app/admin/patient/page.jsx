'use client'

import PatientDetail from '@/app/doctor/patient/page'

export default function AdminPatientDetail() {
  return <PatientDetail activeRole="Admin" backHref="/admin" />
}
