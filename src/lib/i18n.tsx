"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  appName: { en: "Family Accounts", ar: "حسابات العائلة" },
  home: { en: "Home", ar: "الرئيسية" },
  add: { en: "Add", ar: "إضافة" },
  settings: { en: "Settings", ar: "الإعدادات" },
  signInTitle: { en: "Sign in", ar: "تسجيل الدخول" },
  signInHelp: { en: "Enter your email. We'll send you a sign-in link.", ar: "أدخل بريدك الإلكتروني وسنرسل لك رابط الدخول." },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  sendLink: { en: "Send", ar: "إرسال" },
  checkEmail: { en: "Check your email and open the sign-in link on this device. If the email has a code, you can type it here:", ar: "تفقّد بريدك وافتح رابط الدخول على هذا الجهاز. وإن وصلك رمز يمكنك كتابته هنا:" },
  code: { en: "Code", ar: "الرمز" },
  verify: { en: "Sign in", ar: "دخول" },
  back: { en: "Back", ar: "رجوع" },
  welcome: { en: "Welcome!", ar: "أهلاً وسهلاً!" },
  startFamily: { en: "Start a new family", ar: "إنشاء عائلة جديدة" },
  familyName: { en: "Family name", ar: "اسم العائلة" },
  yourName: { en: "Your name", ar: "اسمك" },
  create: { en: "Create", ar: "إنشاء" },
  orJoin: { en: "Or join with an invite code", ar: "أو انضم برمز دعوة" },
  inviteCode: { en: "Invite code", ar: "رمز الدعوة" },
  join: { en: "Join", ar: "انضمام" },
  joinTitle: { en: "Join family", ar: "الانضمام إلى عائلة" },
  whoAreYou: { en: "Are you one of these people?", ar: "هل أنت أحد هؤلاء؟" },
  imNew: { en: "No, I'm new", ar: "لا، أنا جديد" },
  invalidCode: { en: "This invite code is not valid.", ar: "رمز الدعوة غير صحيح." },
  youOweTotal: { en: "You owe", ar: "عليك" },
  owedToYouTotal: { en: "Owed to you", ar: "لك" },
  owesYou: { en: "owes you", ar: "عليه لك" },
  youOwe: { en: "you owe", ar: "عليك له" },
  settled: { en: "Settled", ar: "لا شيء" },
  nothing: { en: "Nothing yet", ar: "لا يوجد شيء بعد" },
  people: { en: "People", ar: "الأشخاص" },
  addPerson: { en: "Add person", ar: "إضافة شخص" },
  name: { en: "Name", ar: "الاسم" },
  save: { en: "Save", ar: "حفظ" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  delete: { en: "Delete", ar: "حذف" },
  edit: { en: "Edit", ar: "تعديل" },
  confirmDelete: { en: "Delete this entry?", ar: "حذف هذا القيد؟" },
  newEntry: { en: "New entry", ar: "قيد جديد" },
  editEntry: { en: "Edit entry", ar: "تعديل القيد" },
  whatHappened: { en: "What happened?", ar: "ماذا حدث؟" },
  iBorrowed: { en: "I borrowed", ar: "استلفت" },
  iLent: { en: "I lent", ar: "أقرضت" },
  iRepaid: { en: "I paid back", ar: "سدّدت" },
  theyRepaid: { en: "They paid me back", ar: "سدّد لي" },
  withWhom: { en: "With whom?", ar: "مع من؟" },
  what: { en: "What?", ar: "ماذا؟" },
  amount: { en: "Amount", ar: "الكمية" },
  note: { en: "Note (optional)", ar: "ملاحظة (اختياري)" },
  date: { en: "Date", ar: "التاريخ" },
  currency: { en: "Money", ar: "نقود" },
  gold: { en: "Gold", ar: "ذهب" },
  silver: { en: "Silver", ar: "فضة" },
  share: { en: "Shares", ar: "أسهم" },
  other: { en: "Other", ar: "أخرى" },
  karat: { en: "Karat", ar: "العيار" },
  ticker: { en: "Share symbol (e.g. AAPL)", ar: "رمز السهم (مثل AAPL)" },
  itemName: { en: "Item name", ar: "اسم الشيء" },
  unitLabel: { en: "Unit (optional)", ar: "الوحدة (اختياري)" },
  grams: { en: "g", ar: "غ" },
  sharesUnit: { en: "shares", ar: "سهم" },
  history: { en: "History", ar: "السجل" },
  borrowedFrom: { en: "borrowed from", ar: "استلف من" },
  lentTo: { en: "lent to", ar: "أقرض" },
  repaidTo: { en: "paid back", ar: "سدّد إلى" },
  familySettings: { en: "Family", ar: "العائلة" },
  inviteLink: { en: "Invite link", ar: "رابط الدعوة" },
  inviteHelp: { en: "Send this link to family members so they can join.", ar: "أرسل هذا الرابط لأفراد العائلة لينضموا." },
  copy: { en: "Copy", ar: "نسخ" },
  copied: { en: "Copied", ar: "تم النسخ" },
  share_: { en: "Share", ar: "مشاركة" },
  newCode: { en: "New link", ar: "رابط جديد" },
  language: { en: "Language", ar: "اللغة" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  hasAccount: { en: "has an account", ar: "لديه حساب" },
  noAccount: { en: "no account yet", ar: "بلا حساب بعد" },
  you: { en: "You", ar: "أنت" },
  error: { en: "Something went wrong", ar: "حدث خطأ" },
  needPerson: { en: "Add a person first", ar: "أضف شخصاً أولاً" },
  allEntries: { en: "All entries", ar: "كل القيود" },
  switchFamily: { en: "Switch family", ar: "تبديل العائلة" },
  removePerson: { en: "Remove", ar: "إزالة" },
  cantRemove: { en: "This person has entries or an account and can't be removed.", ar: "لا يمكن إزالة هذا الشخص لأن له قيوداً أو حساباً." },
  notConfigured: { en: "The app is not connected to its database yet.", ar: "التطبيق غير متصل بقاعدة البيانات بعد." },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  convertAction: { en: "Convert a debt (e.g. dollars to euros or gold)", ar: "تحويل دين (مثلاً دولار إلى يورو أو ذهب)" },
  convertHelp: { en: "Part or all of a debt changes into another currency or gold. Tap a current balance to start from it.", ar: "يتحول جزء من الدين أو كله إلى عملة أخرى أو ذهب. اضغط على رصيد حالي للبدء منه." },
  theyOweMe: { en: "They owe me", ar: "الدين لي عليه" },
  iOweThem: { en: "I owe them", ar: "الدين عليّ له" },
  convertFrom: { en: "Convert from", ar: "تحويل من" },
  convertTo: { en: "Into", ar: "إلى" },
  converted: { en: "converted", ar: "حُوّل" },
  into: { en: "into", ar: "إلى" },
  balanceAfter: { en: "Balance after", ar: "الرصيد بعدها" },
  kindConvert: { en: "Conversion", ar: "تحويل" },
  whoIsWho: { en: "Who is who in this chat?", ar: "من هو من في هذه المحادثة؟" },
  thisIsMe: { en: "This is me", ar: "هذا أنا" },
  ignorePerson: { en: "Not a family member", ar: "ليس من العائلة" },
  chatPhotos: { en: "photos found in the chat", ar: "صور في المحادثة" },
  sourceText: { en: "From", ar: "من النص" },
  privacyNote: { en: "Photos and chats are only read, never saved. Only the entries you confirm are kept.", ar: "الصور والمحادثات تُقرأ فقط ولا تُحفظ أبداً. نحتفظ فقط بالقيود التي تؤكدها." },
  importNav: { en: "Import", ar: "استيراد" },
  importTitle: { en: "Import old records", ar: "استيراد سجلات قديمة" },
  importHelp: { en: "Take a photo of a ledger page, upload screenshots, or add a WhatsApp chat. AI reads it and you confirm every entry before saving.", ar: "صوّر صفحة من الدفتر أو ارفع لقطات شاشة أو محادثة واتساب. يقرأها الذكاء الاصطناعي وتؤكد كل قيد قبل الحفظ." },
  takePhoto: { en: "Take photo", ar: "التقاط صورة" },
  uploadImages: { en: "Upload images", ar: "رفع صور" },
  whatsappFile: { en: "WhatsApp chat file", ar: "ملف محادثة واتساب" },
  whatsappHelp: { en: "In WhatsApp: open the chat › contact name › Export chat › Without media, then save to Files and choose it here. Or copy messages and paste them below.", ar: "في واتساب: افتح المحادثة › اسم الشخص › تصدير الدردشة › بدون وسائط، ثم احفظها في الملفات واخترها هنا. أو انسخ الرسائل والصقها بالأسفل." },
  pasteText: { en: "Or paste text / messages", ar: "أو الصق نصاً أو رسائل" },
  readWithAi: { en: "Read with AI", ar: "اقرأ بالذكاء الاصطناعي" },
  reading: { en: "Reading… this can take up to a minute", ar: "جارٍ القراءة… قد يستغرق ذلك دقيقة" },
  reviewTitle: { en: "Check before saving", ar: "راجع قبل الحفظ" },
  reviewHelp: { en: "Fix anything that's wrong and untick what you don't want.", ar: "صحّح أي خطأ وألغِ تحديد ما لا تريده." },
  from: { en: "From (gave)", ar: "من (أعطى)" },
  to: { en: "To (received)", ar: "إلى (استلم)" },
  kindLoan: { en: "Loan", ar: "دين" },
  kindRepay: { en: "Repayment", ar: "سداد" },
  newPersonOpt: { en: "new", ar: "جديد" },
  saveSelected: { en: "Save selected", ar: "حفظ المحدد" },
  savedN: { en: "entries saved", ar: "قيود حُفظت" },
  noneFound: { en: "No entries found. Try a clearer photo.", ar: "لم يُعثر على قيود. جرّب صورة أوضح." },
  aiNotConfigured: { en: "AI reading isn't switched on yet.", ar: "القراءة بالذكاء الاصطناعي غير مفعّلة بعد." },
  checkThis: { en: "Check this one", ar: "تحقق من هذا" },
  removeFile: { en: "Remove", ar: "إزالة" },
  startOver: { en: "Start over", ar: "البدء من جديد" },
} as const;

export type Key = keyof typeof dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string };
const I18n = createContext<Ctx>({ lang: "ar", setLang: () => {}, t: (k) => dict[k].ar });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };
  return <I18n.Provider value={{ lang, setLang, t: (k) => dict[k][lang] }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);
