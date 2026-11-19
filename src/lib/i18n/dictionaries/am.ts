import type { Dictionary } from "./en";

/**
 * Amharic dictionary. Keys must mirror en.ts.
 * NOTE: translations prepared for the foundation phase and should be
 * reviewed by a native Amharic speaker before release.
 */
export const am: Dictionary = {
  // Common
  "common.appName": "GHMS",
  "common.appFullName": "የጎንደር ሆስፒታል አስተዳደር ሥርዓት",
  "common.hospitalName": "ጎንደር ሆስፒታል",
  "common.search": "ፍለጋ",
  "common.actions": "እርምጃዎች",
  "common.save": "አስቀምጥ",
  "common.cancel": "ተው",
  "common.confirm": "አረጋግጥ",
  "common.close": "ዝጋ",
  "common.back": "ተመለስ",
  "common.viewAll": "ሁሉንም ተመልከት",
  "common.loading": "በመጫን ላይ…",
  "common.language": "ቋንቋ",
  "common.theme": "ገጽታ",
  "common.light": "ብርሃናማ",
  "common.dark": "ጨለማ",
  "common.system": "የሥርዓት",
  "common.english": "English",
  "common.amharic": "አማርኛ",
  "common.logout": "ውጣ",
  "common.profile": "መገለጫ",
  "common.settings": "ቅንብሮች",
  "common.showing": "ከ",
  "common.of": "ከሚቀሩት",
  "common.noResults": "ውጤት አልተገኘም",

  // Topbar
  "topbar.searchPlaceholder": "ታካሚዎች፣ ሞዱሎች፣ ገጾችን ይፈልጉ…",
  "topbar.searchHint": "መተግበሪያውን ለመፈለግ ይጻፉ",
  "topbar.notifications": "ማሳወቂያዎች",
  "topbar.markAllRead": "ሁሉንም እንደተነበቡ ምልክት አድርግ",
  "topbar.noNotifications": "ሁሉም ዝርዝር ተመልክቷል",
  "topbar.profile": "መለያ",

  // Sidebar
  "sidebar.collapse": "ወገኑን አጠቃል",
  "sidebar.expand": "ወገኑን ክፈት",
  "sidebar.closeMenu": "ምናልን ዝጋ",

  // Dashboard
  "dashboard.title": "ዳሽቦርድ",
  "dashboard.subtitle": "የሆስፒታል ሥራዎችና ዋና መረጃዎች በቅጽበት እይታ።",
  "dashboard.stat.totalPatients": "ጠቅላላ ታካሚዎች",
  "dashboard.stat.appointmentsToday": "የዛሬ ቀጠሮዎች",
  "dashboard.stat.availableBeds": "ክፍት አልጋዎች",
  "dashboard.stat.revenueMonth": "ገቢ (በዚህ ወር)",
  "dashboard.stat.vsLastMonth": "ከባለፈው ወር ጋር ሲነጻጸር",
  "dashboard.chart.admissions": "የታካሚዎች መግቢያ",
  "dashboard.chart.admissionsSub": "ወርሃዊ መግቢያና መውጫ፣ ያለፉት 12 ወራት",
  "dashboard.chart.admissionsAxis": "ታካሚዎች",
  "dashboard.chart.departments": "ታካሚዎች በዲፓርትመንት",
  "dashboard.chart.departmentsSub": "በዋና ዲፓርትመንቶች መካከል ያለ ስርጭት",
  "dashboard.chart.legendAdmitted": "ገብተዋል",
  "dashboard.chart.legendDischarged": "ወጥተዋል",
  "dashboard.recentPatients": "አዳዲስ ታካሚዎች",
  "dashboard.recentPatientsSub": "በሁሉም ዲፓርትመንቶች የተመዘገቡ በጥቂቱ",
  "dashboard.upcomingAppointments": "የዛሬ ቀጠሮዎች",

  // Table headers
  "table.patient": "ታካሚ",
  "table.patientId": "የታካሚ ቁጥር",
  "table.department": "ዲፓርትመንት",
  "table.status": "ሁኔታ",
  "table.lastVisit": "መጨረሻ ጉብኝት",
  "table.time": "ሰዓት",
  "table.doctor": "ሐኪም",
  "table.type": "አይነት",

  // Placeholder pages
  "placeholder.moduleTitle": "ሞዱል",
  "placeholder.underDevelopment": "ሞዱሉ በሥራ ላይ ነው",
  "placeholder.underDevelopmentBody":
    "ይህ ሞዱል በቀጣይ የሥራ ደረጃ ይገነባል። አቀማመጥ፣ ዳሰሳና የጋራ አካላት ቀድመው ተዘጋጅተዋል — የመረጃ ገጾች በዚህ መሠረት ይገነባሉ።",
  "placeholder.backToDashboard": "ወደ ዳሽቦርድ ተመለስ",

  // Errors
  "notFound.title": "ገጹ አልተገኘም",
  "notFound.body": "የሚፈልጉት ገጽ የለም ወይም ተዛውሯል።",
};
