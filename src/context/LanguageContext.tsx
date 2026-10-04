import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'bn';

export interface Translations {
  [key: string]: {
    en: string;
    bn: string;
  };
}

export const translations = {
  // Brand & Header
  appTitle: { en: 'FLEET-LEDGER', bn: 'FLEET-LEDGER' },
  appSubtitle: {
    en: 'Commercial Vehicle Daily Income & Cost Management System',
    bn: 'বাণিজ্যিক গাড়ির দৈনিক আয় ও ব্যয়ের হিসাব খতিয়ান',
  },
  dailyFinancialRecords: { en: 'Daily Financial Records', bn: 'দৈনিক আয়-ব্যয় খতিয়ান' },
  monthlyOverviewTab: { en: 'Monthly Overview & Chart', bn: 'মাসিক সারসংক্ষেপ ও চার্ট' },
  monthlyOverviewTitle: { en: 'Monthly Overview', bn: 'মাসিক সারসংক্ষেপ' },
  generatePdfTab: { en: 'Generate PDF Statement', bn: 'পিডিএফ স্টেটমেন্ট তৈরি' },
  fleetAdminTab: { en: 'Fleet Management', bn: 'ফ্লিট ম্যানেজমেন্ট' },
  fleetAdminDesc: {
    en: 'Fleet administration & vehicle management directory',
    bn: 'ফ্লিট অ্যাডমিনিস্ট্রেশন ও যানবাহন ব্যবস্থাপনা ডিরেক্টরি',
  },
  lockAdminSection: { en: 'Lock Admin Section', bn: 'অ্যাডমিন সেকশন লক করুন' },
  lockAndExitAdmin: { en: 'Lock & Exit Admin', bn: 'লক ও প্রস্থান করুন' },
  logout: { en: 'Logout Vehicle Session', bn: 'লগআউট করুন' },
  menu: { en: 'Menu', bn: 'মেনু' },
  protectedBadge: { en: 'Protected', bn: 'সুরক্ষিত' },
  unlockedBadge: { en: 'Unlocked', bn: 'আনলকড' },
  currencyLabel: { en: 'Taka (৳)', bn: 'টাকা (৳)' },
  currencySymbol: { en: '৳', bn: '৳' },

  // Stats cards
  grossIncome: { en: 'Gross Income', bn: 'মোট আয়' },
  fuelCosts: { en: 'Fuel & Costs', bn: 'জ্বালানি ও খরচ' },
  incidentals: { en: 'Incidentals & Toll', bn: 'টোল ও আনুষঙ্গিক খরচ' },
  netProfit: { en: 'Net Balance / Profit', bn: 'নিট ব্যালেন্স / লাভ' },
  recordedDays: { en: 'recorded days', bn: 'দিনের হিসাব' },
  ofIncome: { en: 'of income', bn: 'আয়ের' },
  profitMargin: { en: 'Profit Margin', bn: 'মুনাফা মার্জিন' },

  // Form
  newDailyEntry: { en: 'New Daily Entry', bn: 'নতুন দৈনিক এন্ট্রি' },
  editDailyRecord: { en: 'Edit Daily Record', bn: 'দৈনিক রেকর্ড সম্পাদনা' },
  formSubtext: {
    en: 'Log gross daily trip earnings, fuel purchases, and incidental running expenses.',
    bn: 'দৈনিক মোট ট্রিপ ভাড়া, জ্বালানি খরচ এবং অন্যান্য আনুষঙ্গিক ব্যয়ের হিসাব রাখুন।',
  },
  recordDate: { en: 'Record Date', bn: 'রেকর্ডের তারিখ' },
  dailyIncomeField: { en: 'Daily Income (৳)', bn: 'দৈনিক আয় (৳)' },
  costField: { en: 'Cost (৳)', bn: 'জ্বালানি খরচ (৳)' },
  otherCostField: { en: 'Other / Toll (৳)', bn: 'অন্যান্য / টোল (৳)' },
  tripNotes: {
    en: 'Trip route, client name or booking details (Optional)...',
    bn: 'ট্রিপের রুট, গ্রাহকের নাম বা বুকিং বিবরণ (ঐচ্ছিক)...',
  },
  fuelNotes: {
    en: 'e.g. 35 Liters Diesel, Padma Filling Station...',
    bn: 'উদাঃ ৩৫ লিটার ডিজেল, পদ্মা ফিলিং স্টেশন...',
  },
  otherNotes: {
    en: 'e.g. Expressway toll, car wash, tyre repair...',
    bn: 'উদাঃ এক্সপ্রেসওয়ে টোল, গাড়ি ওয়াশ, টায়ার মেরামত...',
  },
  saveRecord: { en: 'Save Daily Record', bn: 'হিসাব সংরক্ষণ করুন' },
  updateRecord: { en: 'Update Record', bn: 'রেকর্ড আপডেট করুন' },
  cancelBtn: { en: 'Cancel', bn: 'বাতিল' },
  presets: { en: 'Presets:', bn: 'প্রিসেটঃ' },
  presetShuttle: { en: 'City Shuttle', bn: 'সিটি শাটল' },
  presetFreight: { en: 'Inter-district Trip', bn: 'আন্তঃজেলা ট্রিপ' },
  recordSavedSuccess: { en: 'Daily record logged successfully!', bn: 'দৈনিক রেকর্ড সফলভাবে সংরক্ষিত হয়েছে!' },
  recordUpdatedSuccess: { en: 'Record updated successfully!', bn: 'রেকর্ড সফলভাবে আপডেট হয়েছে!' },

  // Ledger Table
  ledgerTitle: { en: 'Daily Financial Ledger', bn: 'দৈনিক আর্থিক লেজার খতিয়ান' },
  showingRecords: { en: 'Showing', bn: 'প্রদর্শিত' },
  totalEntries: { en: 'total entries', bn: 'মোট এন্ট্রি' },
  searchPlaceholder: { en: 'Search dates, earnings, notes...', bn: 'তারিখ, আয় বা বিবরণ অনুসন্ধান করুন...' },
  backupCsv: { en: 'Backup CSV', bn: 'ব্যাকআপ CSV' },
  backupFleetCsv: { en: 'Backup Fleet (CSV)', bn: 'পুরো ফ্লিট ব্যাকআপ (CSV)' },
  dateCol: { en: 'Date', bn: 'তারিখ' },
  incomeCol: { en: 'Income (৳)', bn: 'আয় (৳)' },
  costCol: { en: 'Cost (৳)', bn: 'খরচ (৳)' },
  otherCol: { en: 'Other (৳)', bn: 'অন্যান্য (৳)' },
  balanceCol: { en: 'Balance (৳)', bn: 'ব্যালেন্স (৳)' },
  actionsCol: { en: 'Actions', bn: 'কার্যক্রম' },
  editBtn: { en: 'Edit', bn: 'সম্পাদনা' },
  deleteBtn: { en: 'Delete', bn: 'মুছে ফেলুন' },
  viewAudit: { en: 'View Vehicle Ledger & Audit', bn: 'গাড়ির খতিয়ান ও অডিট দেখুন' },
  noRecords: { en: 'No records found for this period', bn: 'এই সময়ের জন্য কোনো রেকর্ড নেই' },
  tryClearingSearch: { en: 'Try clearing your search query.', bn: 'অনুসন্ধান ফিল্টার পরিবর্তন করে দেখুন।' },
  logNewEntryPrompt: { en: 'Log a new daily entry using the form above.', bn: 'উপরের ফর্মটি ব্যবহার করে নতুন এন্ট্রি দিন।' },

  // Date ranges
  today: { en: 'Today', bn: 'আজ' },
  thisMonth: { en: 'This Month', bn: 'চলতি মাস' },
  lastMonth: { en: 'Last Month', bn: 'গত মাস' },
  last7Days: { en: 'Last 7 Days', bn: 'গত ৭ দিন' },
  allTime: { en: 'All Time', bn: 'সব রেকর্ড' },

  // Admin View
  fleetAdminTitle: { en: 'Fleet Administration & Vehicles Directory', bn: 'ফ্লিট অ্যাডমিনিস্ট্রেশন ও যানবাহন তালিকা' },
  fleetAdminSubtitle: {
    en: 'Overview of all registered commercial vehicles, assigned drivers, and financial performance statements.',
    bn: 'নিবন্ধিত সকল বাণিজ্যিক যানবাহন, চালক এবং আর্থিক পারফরম্যান্সের সারসংক্ষেপ।',
  },
  registerNewVehicle: { en: 'Register Vehicle', bn: 'নতুন গাড়ি নিবন্ধন' },
  driverName: { en: 'Driver Name', bn: 'চালকের নাম' },
  vehicleNumber: { en: 'Log in Number', bn: 'লগইন নম্বর (Log in Number)' },
  vehicleRegisterNumber: { en: 'Vehicle register Number', bn: 'গাড়ির রেজিস্ট্রেশন নম্বর' },
  logInNumber: { en: 'Log in Number', bn: 'লগইন নম্বর (Log in Number)' },
  phoneNumber: { en: 'Phone Number', bn: 'ফোন নম্বর' },
  role: { en: 'Role', bn: 'রোল' },
  youBadge: { en: 'You', bn: 'আপনি' },
  deleteAccount: { en: 'Delete Account', bn: 'অ্যাকাউন্ট মুছুন' },

  // Admin Password Gate
  adminGateTitle: { en: 'Admin Section Protected', bn: 'অ্যাডমিন সেকশন সুরক্ষিত' },
  adminGateSubtitle: {
    en: 'Access to Fleet Administration and vehicle registries is restricted. Please enter the administrator password to continue.',
    bn: 'ফ্লিট অ্যাডমিনিস্ট্রেশন ও যানবাহন ডিরেক্টরিতে প্রবেশের জন্য অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড দিন।',
  },
  adminPasswordLabel: { en: 'Administrator Password', bn: 'অ্যাডমিনিস্ট্রেটর পাসওয়ার্ড' },
  unlockAdmin: { en: 'Unlock Admin', bn: 'অ্যাডমিন আনলক করুন' },

  // PDF & WhatsApp
  pdfStatement: { en: 'PDF Statement', bn: 'পিডিএফ বিবরণী' },
  whatsApp: { en: 'WhatsApp', bn: 'হোয়াটসঅ্যাপ' },
  print: { en: 'Print', bn: 'প্রিন্ট' },
  periodCsv: { en: 'Period CSV', bn: 'পিরিয়ড CSV' },
  downloadPdfBtn: { en: 'Download PDF Statement', bn: 'পিডিএফ ডাউনলোড করুন' },

  // Switch button labels
  languageName: { en: 'বাংলা', bn: 'English' },
  currentLangLabel: { en: 'EN', bn: 'বাং' },
};

export type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
  isBangla: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCAL_STORAGE_LANG_KEY = 'fleet_app_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LANG_KEY);
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {}
    return 'bn'; // Default to Bangla as requested
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LOCAL_STORAGE_LANG_KEY, lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  const t = (key: TranslationKey): string => {
    const item = translations[key];
    if (!item) return key;
    return item[language] || item.en || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isBangla: language === 'bn',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
