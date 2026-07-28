'use client'

import { useEffect, useState } from 'react'
import { Globe2 } from 'lucide-react'
import { usePathname } from 'next/navigation'

const translations = {
  'Medico': 'ميديكو',
  'Unified Healthcare Network': 'شبكة الرعاية الصحية الموحدة',
  'Secure coordination for clinics, labs, pharmacies, and hospitals': 'تنسيق آمن للعيادات والمختبرات والصيدليات والمستشفيات',
  'Healthcare records, connected beautifully.': 'سجلات صحية مترابطة بسلاسة.',
  'Healthcare records,': 'سجلات الرعاية الصحية،',
  'connected beautifully.': 'مترابطة بسلاسة.',
  'A modern medical network where teams can identify patients, coordinate records, and move care forward with clarity and trust.': 'شبكة طبية حديثة تمكّن الفرق من تعريف المرضى وتنسيق السجلات وتطوير الرعاية بوضوح وثقة.',
  'Sign In': 'تسجيل الدخول',
  'Sign Up': 'إنشاء حساب',
  'Sign Out': 'تسجيل الخروج',
  'Welcome back': 'مرحباً بعودتك',
  'Access your assigned Medico workspace.': 'ادخل إلى مساحة عمل ميديكو المخصصة لك.',
  'Email': 'البريد الإلكتروني',
  'Password': 'كلمة المرور',
  'Confirm Password': 'تأكيد كلمة المرور',
  'Forgot Password?': 'هل نسيت كلمة المرور؟',
  'Full Name': 'الاسم الكامل',
  'Create your account': 'أنشئ حسابك',
  'Choose your role and enter your details.': 'اختر دورك وأدخل بياناتك.',
  'Doctor': 'طبيب',
  'Hospital': 'مستشفى',
  'Laboratory': 'مختبر',
  'Pharmacy': 'صيدلية',
  'Doctor Dashboard': 'لوحة تحكم الطبيب',
  'Hospital Dashboard': 'لوحة تحكم المستشفى',
  'Laboratory Dashboard': 'لوحة تحكم المختبر',
  'Pharmacy Dashboard': 'لوحة تحكم الصيدلية',
  'Dashboard': 'لوحة التحكم',
  'Medico Health Platform': 'منصة ميديكو الصحية',
  'Recent Patients': 'المرضى الأخيرون',
  'Overview': 'نظرة عامة',
  'Patients': 'المرضى',
  'Patient Records': 'سجلات المرضى',
  'Lab Records': 'سجلات المختبر',
  'Back to search': 'العودة إلى البحث',
  'Patient Lookup': 'البحث عن مريض',
  'Search by National ID or patient name to open the medical record': 'ابحث بالرقم الوطني أو اسم المريض لفتح السجل الطبي',
  'Enter National ID (e.g., 1234567890)': 'أدخل الرقم الوطني (مثال: 1234567890)',
  'Find Patient': 'البحث عن مريض',
  'Search': 'بحث',
  'Add Patient': 'إضافة مريض',
  'Edit Patient': 'تعديل المريض',
  'New Patient': 'مريض جديد',
  'No patients matched your search': 'لم يتم العثور على مرضى مطابقين لبحثك',
  'Save Changes': 'حفظ التغييرات',
  'Save Patient to Firebase': 'حفظ المريض',
  'Delete patient record?': 'هل تريد حذف سجل المريض؟',
  'Deleting...': 'جارٍ الحذف...',
  'Unnamed Patient': 'مريض بدون اسم',
  'Patient': 'مريض',
  'Patient Information': 'معلومات المريض',
  'National ID': 'الرقم الوطني',
  'Enter patient name or National ID': 'أدخل اسم المريض أو الرقم الوطني',
  '11 digits': '11 رقماً',
  'Select gender': 'اختر الجنس',
  'Year of Birth': 'سنة الميلاد',
  'Gender': 'الجنس',
  'Male': 'ذكر',
  'Female': 'أنثى',
  'Blood Type': 'فصيلة الدم',
  'Weight': 'الوزن',
  'Height': 'الطول',
  'Phone': 'الهاتف',
  'Emergency Contact': 'جهة اتصال للطوارئ',
  'Relationship': 'صلة القرابة',
  'Save': 'حفظ',
  'Saving...': 'جارٍ الحفظ...',
  'Cancel': 'إلغاء',
  'Close': 'إغلاق',
  'Delete': 'حذف',
  'Clear': 'مسح',
  'Edit': 'تعديل',
  'Add': 'إضافة',
  'Active': 'نشط',
  'Pending': 'قيد الانتظار',
  'Completed': 'مكتمل',
  'Prescriptions': 'الوصفات الطبية',
  'New Prescription': 'وصفة طبية جديدة',
  'Edit Prescription': 'تعديل الوصفة الطبية',
  'Add Medication Item': 'إضافة دواء',
  'Medication': 'الدواء',
  'Dosage': 'الجرعة',
  'Frequency': 'التكرار',
  'Duration': 'المدة',
  'Notes': 'ملاحظات',
  'Notes for patient': 'ملاحظات للمريض',
  'Once daily': 'مرة يومياً',
  'Twice daily': 'مرتين يومياً',
  'Three times daily': 'ثلاث مرات يومياً',
  'As needed': 'عند الحاجة',
  'Medical Wallet': 'المحفظة الطبية',
  'Allergies': 'الحساسيات',
  'Radiology': 'الأشعة',
  'Diagnoses': 'التشخيصات',
  'Lab': 'المختبر',
  'Surgeries': 'العمليات الجراحية',
  'Recent Activity': 'النشاط الأخير',
  'Patient Summary': 'ملخص المريض',
  'Contact Information': 'معلومات الاتصال',
  'Medical Information': 'المعلومات الطبية',
  'Upload File': 'رفع ملف',
  'File Name': 'اسم الملف',
  'Type': 'النوع',
  'Date': 'التاريخ',
  'Lab Name': 'اسم المختبر',
  'Diagnosis': 'التشخيص',
  'Surgery': 'العملية الجراحية',
  'Surgeon': 'الجراح',
  'No prescriptions yet': 'لا توجد وصفات طبية بعد',
  'No allergies recorded': 'لا توجد حساسيات مسجلة',
  'No radiology records': 'لا توجد سجلات أشعة',
  'No diagnoses recorded': 'لا توجد تشخيصات مسجلة',
  'No lab records': 'لا توجد سجلات مختبر',
  'No surgeries recorded': 'لا توجد عمليات جراحية مسجلة',
  'No Firebase records yet': 'لا توجد سجلات بعد',
  'Click to edit': 'اضغط للتعديل',
  'select': 'تحديد',
  'selected': 'محدد',
  'Back': 'رجوع',
  'Loading medical workspace': 'جارٍ تحميل مساحة العمل الطبية',
  'Loading patient record': 'جارٍ تحميل سجل المريض',
  'View File': 'عرض الملف',
  'Download': 'تنزيل',
}

const originalText = new WeakMap()
const originalAttributes = new WeakMap()
const translatableAttributes = ['placeholder', 'title', 'aria-label']

function translateValue(value) {
  const leading = value.match(/^\s*/)?.[0] || ''
  const trailing = value.match(/\s*$/)?.[0] || ''
  const clean = value.trim()
  if (!clean) return value
  if (translations[clean]) return `${leading}${translations[clean]}${trailing}`

  const medicationMatch = clean.match(/^(\d+) medications? - (.+)$/)
  if (medicationMatch) {
    return `${leading}${medicationMatch[1]} ${Number(medicationMatch[1]) === 1 ? 'دواء' : 'أدوية'} - ${medicationMatch[2]}${trailing}`
  }
  return value
}

function updateElement(root, language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes = root.nodeType === Node.TEXT_NODE ? [root] : []
  while (walker.nextNode()) textNodes.push(walker.currentNode)

  textNodes.forEach((node) => {
    if (node.parentElement?.closest('[data-language-switch], script, style')) return
    if (!originalText.has(node)) originalText.set(node, node.nodeValue)
    const source = originalText.get(node)
    const nextValue = language === 'ar' ? translateValue(source) : source
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue
  })

  const elements = root.nodeType === Node.ELEMENT_NODE
    ? [root, ...root.querySelectorAll('*')]
    : []

  elements.forEach((element) => {
    if (element.closest?.('[data-language-switch]')) return
    let saved = originalAttributes.get(element)
    if (!saved) {
      saved = {}
      translatableAttributes.forEach((attribute) => {
        if (element.hasAttribute?.(attribute)) saved[attribute] = element.getAttribute(attribute)
      })
      originalAttributes.set(element, saved)
    }
    Object.entries(saved).forEach(([attribute, source]) => {
      element.setAttribute(attribute, language === 'ar' ? translateValue(source) : source)
    })
  })
}

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const [language, setLanguage] = useState('en')
  const [ready, setReady] = useState(false)
  const isDashboardRoute = pathname !== '/'

  useEffect(() => {
    const savedLanguage = localStorage.getItem('medico-language') === 'ar' ? 'ar' : 'en'
    setLanguage(savedLanguage)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('medico-language', language)
    updateElement(document.body, language)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) updateElement(node, language)
        })
      })
    })
    // Observe mounted UI only. Character-data observation can fight React's
    // reconciliation and must not be used for patient/Firebase content.
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language, ready])

  const toggleLanguage = () => setLanguage((current) => current === 'en' ? 'ar' : 'en')

  return (
    <button
      type="button"
      data-language-switch
      data-location={isDashboardRoute ? 'dashboard' : 'signin'}
      onClick={toggleLanguage}
      className={`fixed z-[100] inline-flex h-9 items-center gap-2 rounded-xl border border-[#1D7FE8]/30 bg-[#0F1E36]/95 px-3 text-sm font-semibold text-[#58A6FF] shadow-lg shadow-black/20 backdrop-blur-md transition hover:border-[#58A6FF]/60 hover:bg-[#162A47] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1D7FE8]/60 ${isDashboardRoute ? `bottom-5 ${language === 'ar' ? 'left-5' : 'right-5'}` : language === 'ar' ? 'left-5 top-4' : 'right-5 top-4'}`}
      aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
    >
      <Globe2 className="h-4 w-4" />
      <span>{language === 'en' ? 'العربية' : 'English'}</span>
    </button>
  )
}
