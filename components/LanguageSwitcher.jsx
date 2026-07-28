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
  'Requests': 'الطلبات',
  'Staff': 'الموظفون',
  'Audit': 'سجل التدقيق',
  'Audit history': 'سجل التدقيق',
  'Medico Admin': 'إدارة ميديكو',
  'Secure control center': 'مركز تحكم آمن',
  'Administrator': 'المسؤول',
  'Medico Administrator': 'مسؤول ميديكو',
  'Live Firebase administration': 'إدارة مباشرة عبر فايربيس',
  'Verifying administrator access…': 'جارٍ التحقق من صلاحيات المسؤول…',
  'Verifying administrator accessâ€¦': 'جارٍ التحقق من صلاحيات المسؤول…',
  'Loading Firebase data…': 'جارٍ تحميل بيانات فايربيس…',
  'Loading Firebase dataâ€¦': 'جارٍ تحميل بيانات فايربيس…',
  'System overview': 'نظرة عامة على النظام',
  'Live totals from the shared Firestore database.': 'إحصاءات مباشرة من قاعدة بيانات فايرستور المشتركة.',
  'Active staff': 'الموظفون النشطون',
  'Pending requests': 'الطلبات المعلّقة',
  'Linked mobile patients': 'المرضى المرتبطون بتطبيق الهاتف',
  'Staff by role': 'الموظفون حسب الدور',
  'Recent administrator activity': 'أحدث نشاطات المسؤول',
  'No actions recorded yet.': 'لم تُسجّل أي إجراءات بعد.',
  'Registration requests': 'طلبات التسجيل',
  'Approve or reject access for new healthcare staff.': 'وافق على طلبات موظفي الرعاية الصحية الجدد أو ارفضها.',
  'No staff registration requests yet.': 'لا توجد طلبات تسجيل للموظفين حتى الآن.',
  'Requested': 'تاريخ الطلب',
  'Reject': 'رفض',
  'Approve': 'موافقة',
  'Approved': 'مقبول',
  'Rejected': 'مرفوض',
  'Revoked': 'ملغى',
  'Revoke': 'إلغاء الصلاحية',
  'Approved website users and their Firebase identities.': 'مستخدمو الموقع المقبولون وهوياتهم في فايربيس.',
  'Name': 'الاسم',
  'Role': 'الدور',
  'Firebase UID': 'معرّف فايربيس',
  'Registered': 'تاريخ التسجيل',
  'Access': 'الصلاحية',
  'Actions': 'الإجراءات',
  'All': 'الكل',
  'No staff match these filters.': 'لا يوجد موظفون يطابقون عوامل التصفية.',
  'Edit demographics or permanently delete a patient and related medical records.': 'عدّل بيانات المريض أو احذف المريض وسجلاته الطبية المرتبطة نهائياً.',
  'Contact': 'معلومات الاتصال',
  'Record ID': 'معرّف السجل',
  'Created': 'تاريخ الإنشاء',
  'Unnamed patient': 'مريض بلا اسم',
  'Born': 'مواليد',
  'Not linked': 'غير مرتبط',
  'Open full medical record': 'فتح السجل الطبي الكامل',
  'No patients match this search.': 'لا يوجد مرضى يطابقون هذا البحث.',
  'Immutable record of sensitive administrator actions.': 'سجل غير قابل للتعديل لإجراءات المسؤول الحساسة.',
  'No administrator actions recorded yet.': 'لم تُسجّل إجراءات للمسؤول حتى الآن.',
  'System action': 'إجراء على النظام',
  'Full name': 'الاسم الكامل',
  'Year of birth': 'سنة الميلاد',
  'Blood type': 'فصيلة الدم',
  'Weight (kg)': 'الوزن (كغ)',
  'Height (cm)': 'الطول (سم)',
  'Emergency contact': 'جهة اتصال الطوارئ',
  'Emergency number': 'رقم الطوارئ',
  'Save changes': 'حفظ التغييرات',
  'Permanently delete patient?': 'هل تريد حذف المريض نهائياً؟',
  'Delete everything': 'حذف كل السجلات',
  'Deleting…': 'جارٍ الحذف…',
  'Deletingâ€¦': 'جارٍ الحذف…',
  'Search name, email, UID, national ID…': 'ابحث بالاسم أو البريد أو المعرّف أو الرقم الوطني…',
  'Search name, email, UID, national IDâ€¦': 'ابحث بالاسم أو البريد أو المعرّف أو الرقم الوطني…',
  'Search patients': 'البحث عن المرضى',
  'Search patients…': 'البحث عن المرضى…',
  'Add New Patient': 'إضافة مريض جديد',
  'Total Patients': 'إجمالي المرضى',
  'Total Records': 'إجمالي السجلات',
  'This Month': 'هذا الشهر',
  'View Record': 'عرض السجل',
  'No patients found': 'لم يتم العثور على مرضى',
  'Personal Information': 'المعلومات الشخصية',
  'Basic Information': 'المعلومات الأساسية',
  'Contact Details': 'بيانات الاتصال',
  'Phone Number': 'رقم الهاتف',
  'Email Address': 'البريد الإلكتروني',
  'Emergency Contact Name': 'اسم جهة اتصال الطوارئ',
  'Emergency Contact Number': 'رقم جهة اتصال الطوارئ',
  'Emergency Contact Relationship': 'صلة القرابة بجهة اتصال الطوارئ',
  'Create Patient': 'إنشاء سجل المريض',
  'Update Patient': 'تحديث المريض',
  'Medical Record': 'السجل الطبي',
  'Medical Records': 'السجلات الطبية',
  'General Overview': 'نظرة عامة',
  'Demographics': 'البيانات الشخصية',
  'Vitals': 'المؤشرات الحيوية',
  'Files': 'الملفات',
  'Laboratory Records': 'سجلات المختبر',
  'Radiology Records': 'سجلات الأشعة',
  'Prescription': 'الوصفة الطبية',
  'Add Prescription': 'إضافة وصفة طبية',
  'Add Allergy': 'إضافة حساسية',
  'Edit Allergy': 'تعديل الحساسية',
  'Allergy Name': 'اسم الحساسية',
  'Add Diagnosis': 'إضافة تشخيص',
  'Edit Diagnosis': 'تعديل التشخيص',
  'Diagnosis Name': 'اسم التشخيص',
  'Add Surgery': 'إضافة عملية جراحية',
  'Edit Surgery': 'تعديل العملية الجراحية',
  'Surgery Name': 'اسم العملية الجراحية',
  'Hospital Name': 'اسم المستشفى',
  'Add Laboratory Record': 'إضافة سجل مختبر',
  'Edit Laboratory Record': 'تعديل سجل المختبر',
  'Add Radiology Record': 'إضافة سجل أشعة',
  'Edit Radiology Record': 'تعديل سجل الأشعة',
  'Record Type': 'نوع السجل',
  'Choose File': 'اختيار ملف',
  'No file chosen': 'لم يتم اختيار ملف',
  'File': 'الملف',
  'Open File': 'فتح الملف',
  'File Viewer': 'عارض الملفات',
  'Loading file…': 'جارٍ تحميل الملف…',
  'File not found': 'لم يتم العثور على الملف',
  'Unable to load file': 'تعذّر تحميل الملف',
  'Return to patient record': 'العودة إلى سجل المريض',
  'Select': 'تحديد',
  'Selected': 'محدّد',
  'Delete selected': 'حذف المحدد',
  'Edit selected': 'تعديل المحدد',
  'No records yet': 'لا توجد سجلات حتى الآن',
  'Status': 'الحالة',
  'Record Date': 'تاريخ السجل',
  'Author': 'أُضيف بواسطة',
  'Unknown': 'غير معروف',
  'Today': 'اليوم',
  'days': 'أيام',
  'day': 'يوم',
  'kg': 'كغ',
  'cm': 'سم',
  'mg': 'ملغ',
  'Patient ID': 'معرّف المريض',
  'Loading patients…': 'جارٍ تحميل المرضى…',
  'Please wait': 'يرجى الانتظار',
  'Something went wrong': 'حدث خطأ ما',
  'Try again': 'المحاولة مرة أخرى',
  'No data available': 'لا توجد بيانات متاحة',
  'Required': 'مطلوب',
  'Optional': 'اختياري',
  'Yes': 'نعم',
  'No': 'لا',
  'Confirm': 'تأكيد',
  'Are you sure?': 'هل أنت متأكد؟',
  'This action cannot be undone.': 'لا يمكن التراجع عن هذا الإجراء.',
  'Search by National ID or patient name to begin a consultation': 'ابحث بالرقم الوطني أو اسم المريض لبدء الاستشارة.',
  'Not provided': 'غير متوفر',
  'Number': 'الرقم',
  'Patient not found': 'لم يتم العثور على المريض',
  'File unavailable': 'الملف غير متاح',
  'Loaded from Firestore': 'تم التحميل من فايرستور',
  'Loading file from Firestore...': 'جارٍ تحميل الملف من فايرستور...',
  'This file type can be downloaded.': 'يمكن تنزيل هذا النوع من الملفات.',
  'File record was not found': 'لم يتم العثور على سجل الملف',
  'Could not load file from Firestore': 'تعذّر تحميل الملف من فايرستور',
  'This Firestore record does not contain file data.': 'لا يحتوي سجل فايرستور هذا على بيانات ملف.',
  'Back to patient': 'العودة إلى المريض',
  'Medical file': 'ملف طبي',
  'Nothing here yet': 'لا يوجد محتوى حتى الآن',
  'N/A': 'غير متوفر',
  'YYYY': 'السنة',
  'Select relationship': 'اختر صلة القرابة',
  'Father': 'الأب',
  'Mother': 'الأم',
  'Brother': 'الأخ',
  'Sister': 'الأخت',
  'Spouse': 'الزوج/الزوجة',
  'Child': 'الابن/الابنة',
  'Other': 'أخرى',
  'Doctor Registration': 'تسجيل طبيب',
  'Hospital Registration': 'تسجيل مستشفى',
  'Laboratory Registration': 'تسجيل مختبر',
  'Pharmacy Registration': 'تسجيل صيدلية',
  'Laboratory Name': 'اسم المختبر',
  'Pharmacy Name': 'اسم الصيدلية',
  'Choose your healthcare role': 'اختر دورك في الرعاية الصحية',
  'Create Account': 'إنشاء الحساب',
  'Already have an account?': 'لديك حساب بالفعل؟',
  'Back to sign in': 'العودة إلى تسجيل الدخول',
  'Reset Password': 'إعادة تعيين كلمة المرور',
  'Send Reset Link': 'إرسال رابط إعادة التعيين',
  'Account request submitted': 'تم إرسال طلب إنشاء الحساب',
  'Waiting for administrator approval': 'بانتظار موافقة المسؤول',
  'Could not load patients from Firebase': 'تعذّر تحميل المرضى من فايربيس',
  'Could not verify Firebase access. Please sign in again.': 'تعذّر التحقق من صلاحية فايربيس. يرجى تسجيل الدخول مجدداً.',
  'Patient name is required': 'اسم المريض مطلوب',
  'Patient name can contain letters only': 'يجب أن يحتوي اسم المريض على أحرف فقط',
  'National ID must be exactly 11 digits': 'يجب أن يتكوّن الرقم الوطني من 11 رقماً تماماً',
  'Year of birth must be exactly 4 digits': 'يجب أن تتكوّن سنة الميلاد من 4 أرقام',
  'Choose Male or Female': 'اختر ذكراً أو أنثى',
  'Choose a valid blood type': 'اختر فصيلة دم صحيحة',
  'Weight must be 1 to 3 digits in kg': 'يجب أن يكون الوزن من رقم إلى 3 أرقام بالكيلوغرام',
  'Height must be 1 to 3 digits in cm': 'يجب أن يكون الطول من رقم إلى 3 أرقام بالسنتيمتر',
  'Enter a valid phone number': 'أدخل رقم هاتف صحيحاً',
  'Enter a valid email address': 'أدخل بريداً إلكترونياً صحيحاً',
  'Emergency contact name is required': 'اسم جهة اتصال الطوارئ مطلوب',
  'Emergency contact name can contain letters only': 'يجب أن يحتوي اسم جهة اتصال الطوارئ على أحرف فقط',
  'Emergency contact number must contain 8 to 15 digits': 'يجب أن يحتوي رقم الطوارئ على 8 إلى 15 رقماً',
  'Choose a valid emergency contact relationship': 'اختر صلة قرابة صحيحة لجهة اتصال الطوارئ',
  'This National ID is already in use.': 'هذا الرقم الوطني مستخدم بالفعل.',
  'Patient saved to Firebase': 'تم حفظ المريض في فايربيس',
  'Could not save patient to Firebase': 'تعذّر حفظ المريض في فايربيس',
  'Patient record updated': 'تم تحديث سجل المريض',
  'Could not update patient record': 'تعذّر تحديث سجل المريض',
  'Patient record deleted successfully from the database.': 'تم حذف سجل المريض بنجاح من قاعدة البيانات.',
  'Unknown Firebase error': 'خطأ غير معروف في فايربيس',
  'Are you sure you want to delete the selected records from Firebase?': 'هل أنت متأكد من حذف السجلات المحددة من فايربيس؟',
  'Delete selected records?': 'حذف السجلات المحددة؟',
  'Saving to Firebase...': 'جارٍ الحفظ في فايربيس...',
  'Saving...': 'جارٍ الحفظ...',
  'Deleting...': 'جارٍ الحذف...',
  'Open file': 'فتح الملف',
  'Edit Lab Record': 'تعديل سجل المختبر',
  'Add Lab Record': 'إضافة سجل مختبر',
  'Edit Radiology Record': 'تعديل سجل الأشعة',
  'Add Radiology Record': 'إضافة سجل أشعة',
  'Surgery notes...': 'ملاحظات العملية...',
  'Surgeon name': 'اسم الجرّاح',
  'Hospital name': 'اسم المستشفى',
  'Uploading': 'جارٍ الرفع',
  'Blood': 'الدم',
  'Recent Patients': 'المرضى الأخيرون',
  'Sign out': 'تسجيل الخروج',
  'pending': 'قيد الانتظار',
  'approved': 'مقبول',
  'rejected': 'مرفوض',
  'revoked': 'ملغى',
  'staff_request_approved': 'الموافقة على طلب موظف',
  'staff_request_rejected': 'رفض طلب موظف',
  'staff_access_revoked': 'إلغاء صلاحية موظف',
  'patient_updated': 'تحديث بيانات مريض',
  'patient_deleted': 'حذف سجل مريض',
  'This deletes': 'سيؤدي هذا إلى حذف',
  'the parent Firestore document, prescriptions, diagnoses, allergies, surgeries, laboratory and radiology records, and stored file chunks. This cannot be undone.': 'ومستند فايرستور الأساسي والوصفات والتشخيصات والحساسيات والعمليات وسجلات المختبر والأشعة وأجزاء الملفات المحفوظة. لا يمكن التراجع عن ذلك.',
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

  const requestedMatch = clean.match(/^Requested\s+(.+)$/)
  if (requestedMatch) return `${leading}تاريخ الطلب: ${translateDate(requestedMatch[1])}${trailing}`

  const bornMatch = clean.match(/^Born\s+(.+)$/)
  if (bornMatch) return `${leading}مواليد ${bornMatch[1]}${trailing}`

  const uidMatch = clean.match(/^UID:\s*(.+)$/)
  if (uidMatch) return `${leading}المعرّف: ${uidMatch[1]}${trailing}`

  const editMatch = clean.match(/^Edit\s+(.+)$/)
  if (editMatch) return `${leading}تعديل ${editMatch[1]}${trailing}`

  const medicationMatch = clean.match(/^(\d+) medications? - (.+)$/)
  if (medicationMatch) {
    return `${leading}${medicationMatch[1]} ${Number(medicationMatch[1]) === 1 ? 'دواء' : 'أدوية'} - ${medicationMatch[2]}${trailing}`
  }
  if (/\d/.test(clean)) return `${leading}${translateDate(clean)}${trailing}`
  return value
}

const arabicMonths = {
  Jan: 'يناير', January: 'يناير',
  Feb: 'فبراير', February: 'فبراير',
  Mar: 'مارس', March: 'مارس',
  Apr: 'أبريل', April: 'أبريل',
  May: 'مايو',
  Jun: 'يونيو', June: 'يونيو',
  Jul: 'يوليو', July: 'يوليو',
  Aug: 'أغسطس', August: 'أغسطس',
  Sep: 'سبتمبر', Sept: 'سبتمبر', September: 'سبتمبر',
  Oct: 'أكتوبر', October: 'أكتوبر',
  Nov: 'نوفمبر', November: 'نوفمبر',
  Dec: 'ديسمبر', December: 'ديسمبر',
  AM: 'ص', PM: 'م',
}

function translateDate(value) {
  return Object.entries(arabicMonths).reduce(
    (result, [english, arabic]) => result.replace(new RegExp(`\\b${english}\\b`, 'g'), arabic),
    value
  )
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
    document.body.dataset.language = language
    localStorage.setItem('medico-language', language)
    updateElement(document.body, language)
    window.dispatchEvent(new CustomEvent('medico-language-change', { detail: { language } }))

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
