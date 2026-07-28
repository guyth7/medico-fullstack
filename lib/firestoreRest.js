import { firebaseConfig } from '@/lib/firebase'

const firestoreRestUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`

export const decodeFirestoreValue = (value = {}) => {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue)
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nested]) => [key, decodeFirestoreValue(nested)])
    )
  }
  return value.referenceValue || value.bytesValue || value.geoPointValue || ''
}

export const decodeFirestoreDocument = (document) => ({
  id: document.name.split('/').pop(),
  firestoreId: document.name.split('/').pop(),
  ...Object.fromEntries(
    Object.entries(document.fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)])
  ),
})

export const fetchFirestoreJson = async (url, options) => {
  const response = await fetch(url, options)

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(`Firestore request failed with status ${response.status}${message ? `: ${message}` : ''}`)
  }

  return response.json()
}

export const listPatientsFromFirestore = async () => {
  const data = await fetchFirestoreJson(
    `${firestoreRestUrl}/patients?key=${firebaseConfig.apiKey}&pageSize=1000`
  )

  const patients = (data.documents || []).map(decodeFirestoreDocument)

  return [...new Map(
    patients.map((patient) => [patient.nationalId || patient.firestoreId || patient.id, patient])
  ).values()]
}

export const queryPatientByNationalId = async (nationalId) => {
  const queryResults = await fetchFirestoreJson(
    `${firestoreRestUrl}:runQuery?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'patients' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'nationalId' },
              op: 'EQUAL',
              value: { stringValue: String(nationalId) },
            },
          },
          limit: 1,
        },
      }),
    }
  )

  const document = queryResults.find((result) => result.document)?.document
  return document ? decodeFirestoreDocument(document) : null
}

export const getPatientDocument = async (firestoreId) => (
  decodeFirestoreDocument(await fetchFirestoreJson(
    `${firestoreRestUrl}/patients/${encodeURIComponent(firestoreId)}?key=${firebaseConfig.apiKey}`
  ))
)

export const listPatientSubcollection = async (firestoreId, name) => {
  const data = await fetchFirestoreJson(
    `${firestoreRestUrl}/patients/${encodeURIComponent(firestoreId)}/${name}?key=${firebaseConfig.apiKey}&pageSize=1000`
  )

  return (data.documents || [])
    .map(decodeFirestoreDocument)
    .filter((record) => record.id !== '_meta')
}
