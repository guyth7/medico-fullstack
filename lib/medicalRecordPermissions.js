const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase()
  return value === 'lab' || value === 'laboratory' ? 'lab' : value
}

const normalizeField = (field) => {
  const aliases = {
    lab_results: 'lab',
    laboratory: 'lab',
    prescription: 'prescriptions',
    diagnosis: 'diagnoses',
    surgery: 'surgeries',
    allergy: 'allergies',
  }
  const value = String(field || '').trim().toLowerCase()
  return aliases[value] || value
}

const fullAccess = Object.freeze({ view: true, add: true, edit: true, delete: true })
const labViewOnly = Object.freeze({ view: true, add: false, edit: false, delete: false })

const rolePolicies = {
  hospital: {
    default: fullAccess,
    fields: {},
  },
  pharmacy: {
    default: labViewOnly,
    fields: {},
  },
  doctor: {
    default: fullAccess,
    fields: {
      lab: labViewOnly,
      radiology: labViewOnly,
    },
  },
  lab: {
    default: fullAccess,
    fields: {
      allergies: labViewOnly,
      diagnoses: labViewOnly,
      prescriptions: labViewOnly,
      surgeries: labViewOnly,
    },
  },
}

export const getMedicalRecordPermissions = (role, field) => {
  const policy = rolePolicies[normalizeRole(role)]
  if (!policy) return fullAccess
  return policy.fields[normalizeField(field)] || policy.default
}

export const canUseMedicalRecordAction = (role, field, action) => (
  Boolean(getMedicalRecordPermissions(role, field)[action])
)
