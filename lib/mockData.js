// Centralized mock data for Medico platform

export const currentPatient = {
  id: '1234567890',
  nationalId: '1234567890',
  name: 'Ahmad Al-Hassan',
  yearOfBirth: 1984,
  gender: 'Male',
  bloodType: 'A+',
  phone: '+966 50 123 4567',
  email: 'ahmad.hassan@email.com',
  allergies: ['Penicillin', 'Sulfa drugs'],
  chronic: ['Type 2 Diabetes', 'Hypertension'],
  emergencyContact: 'Fatima Al-Hassan (+966 55 987 6543)',
  height: 175,
  weight: 84,
}

export const patients = [
  currentPatient,
  { id: '9876543210', nationalId: '9876543210', name: 'Layla Mansour', yearOfBirth: 1992, gender: 'Female', bloodType: 'O-', allergies: ['Aspirin'], chronic: ['Asthma'] },
  { id: '5544332211', nationalId: '5544332211', name: 'Omar Khalil', yearOfBirth: 1968, gender: 'Male', bloodType: 'B+', allergies: [], chronic: ['Hypertension', 'High Cholesterol'] },
  { id: '1122334455', nationalId: '1122334455', name: 'Sara Ibrahim', yearOfBirth: 1999, gender: 'Female', bloodType: 'AB+', allergies: ['Latex'], chronic: [] },
]

export const doctors = [
  { id: 'd1', name: 'Dr. Khaled Nour', specialty: 'Internal Medicine', license: 'KSA-IM-4421' },
  { id: 'd2', name: 'Dr. Maha Saleh', specialty: 'Endocrinology', license: 'KSA-EN-7812' },
  { id: 'd3', name: 'Dr. Yousef Al-Ahmadi', specialty: 'Cardiology', license: 'KSA-CA-2390' },
  { id: 'd4', name: 'Dr. Rana Khoury', specialty: 'Radiology', license: 'KSA-RD-5512' },
]

export const diagnoses = [
  { id: 'dx1', patientId: '1234567890', name: 'Type 2 Diabetes Mellitus', date: '2019-03-12', icd: 'E11.9', doctor: 'Dr. Maha Saleh' },
  { id: 'dx2', patientId: '1234567890', name: 'Essential Hypertension', date: '2020-07-22', icd: 'I10', doctor: 'Dr. Yousef Al-Ahmadi' },
  { id: 'dx3', patientId: '1234567890', name: 'Hyperlipidemia', date: '2022-01-08', icd: 'E78.5', doctor: 'Dr. Khaled Nour' },
]

export const surgeries = [
  { id: 's1', patientId: '1234567890', name: 'Laparoscopic Cholecystectomy', date: '2018-11-04', surgeon: 'Dr. Faisal Tamimi', outcome: 'Successful', hospital: 'King Fahd Medical City' },
  { id: 's2', patientId: '1234567890', name: 'Right Knee Arthroscopy', date: '2021-06-19', surgeon: 'Dr. Hadi Ramzi', outcome: 'Successful', hospital: 'Saudi German Hospital' },
  { id: 's3', patientId: '9876543210', name: 'Appendectomy', date: '2023-09-02', surgeon: 'Dr. Faisal Tamimi', outcome: 'Successful', hospital: 'King Fahd Medical City' },
]

export const prescriptions = [
  {
    id: 'rx1', patientId: '1234567890', doctor: 'Dr. Maha Saleh', date: '2025-05-20', status: 'Active',
    items: [
      { name: 'Metformin', dosage: '1000 mg', frequency: 'Twice daily', duration: '90 days', progress: 60, notes: 'Take with food' },
      { name: 'Glimepiride', dosage: '2 mg', frequency: 'Once daily', duration: '90 days', progress: 60, notes: 'Morning before breakfast' },
    ],
  },
  {
    id: 'rx2', patientId: '1234567890', doctor: 'Dr. Yousef Al-Ahmadi', date: '2025-06-01', status: 'Pending Pickup',
    items: [
      { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', duration: '30 days', progress: 0, notes: 'Evening' },
      { name: 'Augmentin', dosage: '1 g', frequency: 'Twice daily', duration: '7 days', progress: 0, notes: 'After meals' },
    ],
  },
  {
    id: 'rx3', patientId: '1234567890', doctor: 'Dr. Khaled Nour', date: '2024-09-14', status: 'Completed',
    items: [
      { name: 'Atorvastatin', dosage: '20 mg', frequency: 'Once daily', duration: '90 days', progress: 100, notes: 'At bedtime' },
    ],
  },
]

export const labResults = [
  { id: 'lab1', patientId: '1234567890', test: 'Complete Blood Count (CBC)', date: '2025-06-10', status: 'Pending', requestedBy: 'Dr. Maha Saleh', notes: 'Routine follow-up' },
  { id: 'lab2', patientId: '1234567890', test: 'HbA1c', date: '2025-05-28', status: 'Completed', requestedBy: 'Dr. Maha Saleh', value: '7.2%', range: '<6.5%' },
  { id: 'lab3', patientId: '1234567890', test: 'Lipid Panel', date: '2025-05-28', status: 'Completed', requestedBy: 'Dr. Khaled Nour', value: 'LDL 142 mg/dL', range: '<100 mg/dL' },
  { id: 'lab4', patientId: '9876543210', test: 'Thyroid Function', date: '2025-06-08', status: 'In Progress', requestedBy: 'Dr. Khaled Nour' },
]

export const radiology = [
  { id: 'rad1', patientId: '1234567890', type: 'Chest X-Ray', bodyArea: 'Chest', date: '2025-06-12', status: 'Pending', priority: 'Normal', requestedBy: 'Dr. Khaled Nour' },
  { id: 'rad2', patientId: '1234567890', type: 'MRI', bodyArea: 'Lumbar Spine', date: '2025-04-03', status: 'Completed', priority: 'Normal', requestedBy: 'Dr. Yousef Al-Ahmadi', findings: 'Mild L4-L5 disc bulge, no nerve impingement.' },
  { id: 'rad3', patientId: '1234567890', type: 'CT', bodyArea: 'Abdomen', date: '2024-11-21', status: 'Completed', priority: 'Urgent', requestedBy: 'Dr. Faisal Tamimi', findings: 'No acute findings.' },
  { id: 'rad4', patientId: '5544332211', type: 'Ultrasound', bodyArea: 'Abdomen', date: '2025-06-09', status: 'In Progress', priority: 'Normal', requestedBy: 'Dr. Khaled Nour' },
]

export const dailyLogs = (() => {
  const today = new Date()
  const arr = []
  const bloods = [142, 138, 155, 130, 128, 134, 122]
  const sys = [142, 138, 145, 135, 132, 130, 128]
  const dia = [92, 88, 94, 86, 84, 83, 82]
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    arr.push({
      date: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      bloodSugar: bloods[6 - i],
      systolic: sys[6 - i],
      diastolic: dia[6 - i],
      weight: 84 - i * 0.1,
      temperature: 36.6 + (i % 3) * 0.1,
    })
  }
  return arr
})()

export const reminders = [
  { id: 'rm1', medication: 'Metformin 1g', time: '08:00', taken: true },
  { id: 'rm2', medication: 'Amlodipine 5mg', time: '20:00', taken: false },
  { id: 'rm3', medication: 'Glimepiride 2mg', time: '07:30', taken: true },
  { id: 'rm4', medication: 'Augmentin 1g', time: '14:00', taken: false },
]

export const pendingTasks = [
  { id: 't1', icon: 'pill', label: 'Buy Augmentin 1g', sub: 'Prescribed by Dr. Yousef', urgent: true },
  { id: 't2', icon: 'flask', label: 'Complete CBC Blood Test', sub: 'Requested by Dr. Maha', urgent: false },
  { id: 't3', icon: 'scan', label: 'Perform Chest X-Ray', sub: 'Requested by Dr. Khaled', urgent: false },
]

export const notifications = [
  { id: 'n1', icon: 'pill', title: 'Time to take Metformin', body: '1000 mg with breakfast', time: '2 min ago', unread: true },
  { id: 'n2', icon: 'flask', title: 'Lab results ready', body: 'HbA1c results have been uploaded', time: '1 hour ago', unread: true },
  { id: 'n3', icon: 'calendar', title: 'Appointment reminder', body: 'Dr. Maha Saleh tomorrow 10:00 AM', time: '3 hours ago', unread: false },
  { id: 'n4', icon: 'check', title: 'Prescription delivered', body: 'Amlodipine ready for pickup', time: 'Yesterday', unread: false },
]

export const admissions = [
  { id: 'a1', patientId: '1234567890', patientName: 'Ahmad Al-Hassan', date: '2025-06-08', ward: 'Cardiology — Room 304', doctor: 'Dr. Yousef Al-Ahmadi', status: 'Admitted', notes: 'Post-hypertensive crisis observation' },
  { id: 'a2', patientId: '9876543210', patientName: 'Layla Mansour', date: '2025-06-11', ward: 'General — Room 212', doctor: 'Dr. Khaled Nour', status: 'Admitted', notes: 'Severe asthma exacerbation' },
  { id: 'a3', patientId: '5544332211', patientName: 'Omar Khalil', date: '2025-05-30', ward: 'Cardiology — Room 301', doctor: 'Dr. Yousef Al-Ahmadi', status: 'Discharged', notes: 'Routine cardiac evaluation' },
]

export const wards = ['Cardiology', 'General Medicine', 'ICU', 'Pediatrics', 'Orthopedics', 'Neurology']
