import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'

export const patientSubcollections = ['allergies', 'diagnoses', 'lab', 'radiology', 'surgeries', 'prescriptions']
const legacySubcollections = ['diagnosis']
const removedFileRecordFields = new Set(['fileBase64Length', 'fileChunkCount', 'fileChunkSize', 'fileStorageType', 'fileViewerPath'])
const inlineFileMaxBase64Length = 850 * 1024

export const patientDocumentId = (patient) => {
  const name = String(patient.name || 'patient')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'patient'
  const nationalId = String(patient.nationalId || '')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '')

  return nationalId ? `${name}-${nationalId}` : name
}

export const renamePatientDocument = async (db, oldId, updatedPatient) => {
  const newId = patientDocumentId(updatedPatient)
  if (!newId || newId === oldId) return oldId

  try {
    await setDoc(doc(db, 'patients', newId), updatedPatient, { merge: true })

    await Promise.all(patientSubcollections.map(async (collectionName) => {
      const recordsSnapshot = await getDocs(collection(db, 'patients', oldId, collectionName))
      await Promise.all(recordsSnapshot.docs.map(async (recordDoc) => {
        const recordData = Object.fromEntries(
          Object.entries(recordDoc.data()).filter(([field]) => !removedFileRecordFields.has(field))
        )
        await setDoc(doc(db, 'patients', newId, collectionName, recordDoc.id), recordData, { merge: true })
      }))
    }))

    // This must complete before callers update React state. Any cleanup failure
    // rejects the rename and leaves the UI pointing at the original record.
    await deletePatientRecord(db, oldId)
    return newId
  } catch (error) {
    console.error(`Could not rename patient document "${oldId}" to "${newId}":`, error)
    throw error
  }
}

export const ensurePatientSubcollections = async (db, patientId) => {
  await Promise.all(patientSubcollections.map((name) => setDoc(doc(db, 'patients', patientId, name, '_meta'), {
    collection: name,
    visibleInFirebaseConsole: true,
    backendCollections: patientSubcollections,
    note: 'Marker document so this subcollection appears in Firebase Console. Real records are separate documents.',
    updatedAt: serverTimestamp(),
  }, { merge: true })))

  await Promise.all(legacySubcollections.map(async (name) => {
    const snapshot = await getDocs(collection(db, 'patients', patientId, name))
    await Promise.all(snapshot.docs.map((recordDoc) => deleteDoc(recordDoc.ref)))
  }))
}

export const deletePatientRecord = async (db, patientId) => {
  const normalizedPatientId = String(patientId || '').trim()
  if (!normalizedPatientId) {
    throw new Error('A valid patient document ID is required for deletion.')
  }

  const patientRef = doc(db, 'patients', normalizedPatientId)
  const cleanupErrors = []

  // Delete the requested patient first. Descendant cleanup is best-effort and
  // must not make a successful parent deletion appear to have failed.
  try {
    await deleteDoc(patientRef)
  } catch (error) {
    console.error(`Critical: parent patient document "${normalizedPatientId}" was not deleted:`, error)
    throw error
  }

  // Firestore does not cascade-delete subcollections, so remove descendants
  // after the parent write has succeeded.
  const cleanupResults = await Promise.allSettled(
    [...patientSubcollections, ...legacySubcollections].map(async (collectionName) => {
      const recordsSnapshot = await getDocs(collection(db, 'patients', normalizedPatientId, collectionName))
      await Promise.all(recordsSnapshot.docs.map(async (recordDoc) => {
        if (['lab', 'radiology'].includes(collectionName) && recordDoc.id !== '_meta') {
          const chunksSnapshot = await getDocs(collection(db, 'patients', normalizedPatientId, collectionName, recordDoc.id, 'fileChunks'))
          await Promise.all(chunksSnapshot.docs.map((chunkDoc) => deleteDoc(chunkDoc.ref)))
        }
        await deleteDoc(recordDoc.ref)
      }))
    })
  )

  cleanupResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      cleanupErrors.push({
        collection: [...patientSubcollections, ...legacySubcollections][index],
        error: result.reason,
      })
    }
  })

  if (cleanupErrors.length > 0) {
    console.error(
      `Patient "${normalizedPatientId}" was deleted, but some descendant cleanup failed:`,
      cleanupErrors
    )
  }

  return {
    patientId: normalizedPatientId,
    deleted: true,
    cleanupErrors,
  }
}

export const migratePatientToNamedDocument = async (db, patientDoc) => {
  const patientData = patientDoc.data()
  const namedId = patientDocumentId(patientData)
  if (!namedId || patientDoc.id === namedId) return { firestoreId: patientDoc.id, id: patientDoc.id, ...patientData }

  const targetRef = doc(db, 'patients', namedId)
  await setDoc(targetRef, patientData, { merge: true })

  await Promise.all(patientSubcollections.map(async (collectionName) => {
    const recordsSnapshot = await getDocs(collection(db, 'patients', patientDoc.id, collectionName))
    await Promise.all(recordsSnapshot.docs.map(async (recordDoc) => {
      const recordData = recordDoc.data()
      const cleanRecordData = Object.fromEntries(Object.entries(recordData).filter(([field]) => !removedFileRecordFields.has(field)))
      if (['lab', 'radiology'].includes(collectionName) && recordDoc.id !== '_meta') {
        cleanRecordData.storageStatus = 'saved'
      }

      if (['lab', 'radiology'].includes(collectionName) && recordDoc.id !== '_meta') {
        const chunksSnapshot = await getDocs(collection(db, 'patients', patientDoc.id, collectionName, recordDoc.id, 'fileChunks'))
        if (!cleanRecordData.fileBase64 && chunksSnapshot.docs.length > 0) {
          const fileBase64 = chunksSnapshot.docs
            .map((chunkDoc) => chunkDoc.data())
            .sort((first, second) => (first.order ?? 0) - (second.order ?? 0))
            .map((chunk) => chunk.data || '')
            .join('')

          if (fileBase64.length <= inlineFileMaxBase64Length) {
            cleanRecordData.fileBase64 = fileBase64
          }
        }
      }

      await setDoc(doc(db, 'patients', namedId, collectionName, recordDoc.id), cleanRecordData, { merge: true })
    }))
  }))

  await ensurePatientSubcollections(db, namedId)
  return { firestoreId: namedId, id: namedId, ...patientData }
}

export const listPatients = async (db) => {
  const snapshot = await getDocs(collection(db, 'patients'))
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, firestoreId: docSnapshot.id, ...docSnapshot.data() }))
}

export const findPatientByNationalId = async (db, nationalId) => {
  const normalized = String(nationalId || '').trim()
  if (!normalized) return null

  const snapshot = await getDocs(query(
    collection(db, 'patients'),
    where('nationalId', '==', normalized)
  ))
  return snapshot
}

export const safelyLoadNamedPatient = async (db, patientDoc) => {
  try {
    return await migratePatientToNamedDocument(db, patientDoc)
  } catch (error) {
    console.error('Could not migrate patient to readable Firestore ID:', error)
    const patientData = patientDoc.data()
    return { firestoreId: patientDoc.id, id: patientDoc.id, ...patientData }
  }
}




