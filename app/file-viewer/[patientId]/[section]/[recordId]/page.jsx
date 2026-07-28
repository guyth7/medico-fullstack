'use client'
import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function FileViewer({ params }) {
  const { patientId, section, recordId } = use(params)
  const [record, setRecord] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let objectUrl = ''

    const base64ToObjectUrl = (base64, type) => {
      const binary = atob(base64)
      const chunks = []
      const sliceSize = 1024 * 128

      for (let offset = 0; offset < binary.length; offset += sliceSize) {
        const slice = binary.slice(offset, offset + sliceSize)
        const bytes = new Uint8Array(slice.length)
        for (let index = 0; index < slice.length; index += 1) {
          bytes[index] = slice.charCodeAt(index)
        }
        chunks.push(bytes)
      }

      objectUrl = URL.createObjectURL(new Blob(chunks, { type: type || 'application/octet-stream' }))
      return objectUrl
    }

    const loadRecordFile = async (targetPatientId) => {
      const snapshot = await getDoc(doc(db, 'patients', targetPatientId, section, recordId))
      if (!snapshot.exists()) return null

      const loadedRecord = { id: snapshot.id, patientFirestoreId: targetPatientId, ...snapshot.data() }

      if (loadedRecord.fileDataUrl) {
        return { record: loadedRecord, url: loadedRecord.fileDataUrl }
      }

      if (loadedRecord.fileBase64) {
        return { record: loadedRecord, url: base64ToObjectUrl(loadedRecord.fileBase64, loadedRecord.fileType) }
      }

      const chunksSnapshot = await getDocs(collection(db, 'patients', targetPatientId, section, recordId, 'fileChunks'))
      const fileBase64 = chunksSnapshot.docs
        .map((chunkDoc) => chunkDoc.data())
        .sort((first, second) => (first.order ?? 0) - (second.order ?? 0))
        .map((chunk) => chunk.data || '')
        .join('')

      if (fileBase64) {
        return { record: loadedRecord, url: base64ToObjectUrl(fileBase64, loadedRecord.fileType) }
      }

      return { record: loadedRecord, url: '' }
    }

    const nationalIdFromPath = () => {
      const match = patientId.match(/(\d+)$/)
      return match?.[1] || ''
    }

    const loadFile = async () => {
      try {
        const primaryFile = await loadRecordFile(patientId)
        if (primaryFile?.record) setRecord(primaryFile.record)
        if (primaryFile?.url) {
          setFileUrl(primaryFile.url)
          return
        }

        const nationalId = primaryFile?.record?.nationalId || nationalIdFromPath()
        if (nationalId) {
          const patientsSnapshot = await getDocs(query(collection(db, 'patients'), where('nationalId', '==', nationalId)))
          for (const patientDoc of patientsSnapshot.docs) {
            if (patientDoc.id === patientId) continue
            const fallbackFile = await loadRecordFile(patientDoc.id)
            if (fallbackFile?.record && !primaryFile?.record) setRecord(fallbackFile.record)
            if (fallbackFile?.url) {
              setRecord(fallbackFile.record)
              setFileUrl(fallbackFile.url)
              return
            }
          }
        }

        if (!primaryFile?.record) {
          setError('File record was not found')
        }
      } catch (err) {
        console.error(err)
        setError('Could not load file from Firestore')
      } finally {
        setLoading(false)
      }
    }

    loadFile()

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [patientId, section, recordId])

  const isImage = record?.fileType?.startsWith('image/')
  const isPdf = record?.fileType === 'application/pdf'

  const downloadName = useMemo(() => record?.fileName || 'medical-file', [record])

  if (loading) {
    return <div className="min-h-screen bg-[#0A1628] text-slate-300 flex items-center justify-center">Loading file from Firestore...</div>
  }

  if (error || !fileUrl) {
    return (
      <div className="min-h-screen bg-[#0A1628] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-slate-500" />
          <h1 className="font-display text-xl font-semibold mb-2">File unavailable</h1>
          <p className="text-sm text-slate-400">{error || 'This Firestore record does not contain file data.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <header className="sticky top-0 z-10 bg-[#0A1628]/90 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href={`/doctor/patient/${patientId}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to patient
        </Link>
        <a href={fileUrl} download={downloadName} className="inline-flex items-center gap-2 rounded-lg bg-[#1D7FE8] px-4 py-2 text-sm font-medium hover:bg-[#1D7FE8]/90">
          <Download className="w-4 h-4" /> Download
        </a>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold">{record.fileName || record.type || 'Medical file'}</h1>
          <p className="text-sm text-slate-400 mt-1">Loaded from Firestore</p>
        </div>

        {isImage && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <img src={fileUrl} alt={record.fileName || 'Medical file'} className="max-h-[75vh] mx-auto rounded-xl object-contain" />
          </div>
        )}

        {isPdf && (
          <iframe src={fileUrl} title={record.fileName || 'PDF file'} className="w-full h-[78vh] rounded-2xl border border-white/10 bg-white" />
        )}

        {!isImage && !isPdf && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center text-slate-300">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p>This file type can be downloaded.</p>
          </div>
        )}
      </main>
    </div>
  )
}
