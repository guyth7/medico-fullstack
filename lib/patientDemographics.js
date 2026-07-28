export const getPatientYearOfBirth = (patient) => {
  const storedYear = String(patient?.yearOfBirth || '').trim()
  if (/^\d{4}$/.test(storedYear)) return storedYear

  const legacyAge = Number(patient?.age)
  if (Number.isFinite(legacyAge) && legacyAge >= 0 && legacyAge <= 130) {
    return String(new Date().getFullYear() - legacyAge)
  }

  return ''
}
