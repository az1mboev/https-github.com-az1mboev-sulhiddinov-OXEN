import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Language type — 20 supported languages                             */
/* ------------------------------------------------------------------ */

export type Language =
  | "en" | "uz" | "tr" | "ru" | "ar" | "de" | "fr" | "es"
  | "it" | "pt" | "zh" | "ja" | "ko" | "hi" | "fa" | "kk"
  | "ky" | "tg" | "uk" | "az";

export interface LanguageMeta {
  code: Language;
  label: string;
  native: string;
  flag: string;
  rtl?: boolean;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", label: "English", native: "English", flag: "🇺🇸" },
  { code: "uz", label: "Uzbek", native: "O'zbekcha", flag: "🇺🇿" },
  { code: "tr", label: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦", rtl: true },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", native: "Português", flag: "🇧🇷" },
  { code: "zh", label: "Chinese (Simplified)", native: "中文", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "fa", label: "Persian (Farsi)", native: "فارسی", flag: "🇮🇷", rtl: true },
  { code: "kk", label: "Kazakh", native: "Қазақша", flag: "🇰🇿" },
  { code: "ky", label: "Kyrgyz", native: "Кыргызча", flag: "🇰🇬" },
  { code: "tg", label: "Tajik", native: "Тоҷикӣ", flag: "🇹🇯" },
  { code: "uk", label: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "az", label: "Azerbaijani", native: "Azərbaycanca", flag: "🇦🇿" },
];

const STORAGE_KEY = "safario.language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored as Language;
    const browser = navigator.language.split("-")[0] ?? "en";
    return LANGUAGES.some((l) => l.code === browser) ? (browser as Language) : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    setLanguageState(detectLanguage());
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    const meta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const bundle = TRANSLATIONS[language] as Record<string, string> | undefined;
      return bundle?.[key] ?? fallback ?? key;
    },
    [language],
  );

  const isRTL = useMemo(() => {
    const meta = LANGUAGES.find((l) => l.code === language);
    return meta?.rtl ?? false;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t, isRTL }),
    [language, setLanguage, t, isRTL],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Translations                                                       */
/* ------------------------------------------------------------------ */

const TRANSLATIONS: Partial<Record<Language, Record<string, string>>> = {
  en: {
    "nav.globe": "Globe", "nav.explore": "Explore", "nav.travel": "Travel",
    "nav.trips": "Trips", "nav.planner": "Planner", "nav.dashboard": "Dashboard",
    "nav.profile": "Profile",
    "hero.title.line1": "See the world", "hero.title.line2": "from above.",
    "hero.subtitle": "Spin the globe, discover countries, and let AI plan your next great escape.",
    "hero.cta": "Plan a trip with AI",
    "hero.hint": "Tap to activate · drag to spin · tap a marker to explore",
    "home.featured": "Featured destinations", "home.countries": "countries", "home.signin": "Sign in",
    "planner.title": "AI Trip Planner", "planner.placeholder": "Describe your dream trip...",
    "planner.generate": "Generate Itinerary", "planner.loading": "Planning your trip...",
    "dashboard.title": "Dashboard", "dashboard.wishlist": "Wishlist",
    "dashboard.visited": "Visited", "dashboard.itineraries": "Saved Itineraries",
    "profile.title": "Profile", "profile.signout": "Sign Out",
    "profile.language": "Language", "profile.selectLanguage": "Select Language",
    "auth.signin": "Sign In", "auth.signup": "Sign Up",
    "auth.email": "Email", "auth.password": "Password", "auth.name": "Name",
    "auth.google": "Continue with Google", "auth.apple": "Continue with Apple",
    "auth.switchToSignup": "Don't have an account? Sign up",
    "auth.switchToSignin": "Already have an account? Sign in",
    "country.overview": "Overview", "country.cities": "Cities", "country.facts": "Facts",
    "country.currency": "Currency", "country.language": "Language", "country.season": "Best Season",
    "common.back": "Back", "common.loading": "Loading...",
    "common.error": "Something went wrong", "common.save": "Save", "common.cancel": "Cancel",

    /* Settings — section headers */
    "settings.title": "Profile Settings", "settings.subtitle": "Customize your SAFARIO experience",
    "settings.account": "Account", "settings.privacy": "Privacy", "settings.security": "Security",
    "settings.notifications": "Notifications", "settings.appearance": "Appearance",
    "settings.offline": "Offline Mode", "settings.travel": "Travel Settings",
    "settings.data": "Data", "settings.support": "Support",

    /* Settings — account rows */
    "settings.editProfile": "Edit Profile", "settings.messages": "Messages",
    "settings.admin": "Admin Dashboard", "settings.username": "Username",
    "settings.email": "Email Address", "settings.unread": "unread", "settings.caughtUp": "All caught up",

    /* Settings — privacy rows */
    "settings.privateAccount": "Private Account", "settings.showEmail": "Show Email",
    "settings.showFollowers": "Show Followers", "settings.allowMessages": "Allow Messages",
    "settings.blockedUsers": "Blocked Users",

    /* Settings — security rows */
    "settings.changePassword": "Change Password", "settings.twoFactor": "Two-Factor Authentication",
    "settings.activeDevices": "Active Devices", "settings.loginActivity": "Login Activity",
    "settings.biometrics": "Face ID / Touch ID",

    /* Settings — notification rows */
    "settings.pushNotif": "Push Notifications", "settings.emailNotif": "Email Notifications",
    "settings.travelAlerts": "Travel Alerts", "settings.aiRecs": "AI Recommendations",

    /* Settings — appearance */
    "settings.darkMode": "Dark Mode", "settings.lightMode": "Light Mode",

    /* Settings — offline */
    "settings.forceOffline": "Force Offline Mode", "settings.connectionStatus": "Connection Status",
    "settings.online": "Online", "settings.offlineStatus": "Offline",
    "settings.pendingSync": "Pending Sync", "settings.lastSynced": "Last Synced",

    /* Settings — travel */
    "settings.distanceUnit": "Distance Unit", "settings.currency": "Currency",
    "settings.timezone": "Time Zone", "settings.kilometers": "Kilometers", "settings.miles": "Miles",

    /* Settings — data */
    "settings.clearCache": "Clear Cache", "settings.downloadData": "Download My Data",
    "settings.exportHistory": "Export Travel History",

    /* Settings — support */
    "settings.helpCenter": "Help Center", "settings.contactSupport": "Contact Support",
    "settings.reportProblem": "Report Problem", "settings.sendFeedback": "Send Feedback",
    "settings.about": "About SAFARIO",

    /* Settings — misc */
    "settings.logOut": "Log Out", "settings.version": "SAFARIO v1.0.0 — Built for explorers",

    /* Nav — sidebar extra */
    "nav.services": "Travel Services", "nav.premium": "Premium Membership",
    "nav.consulting": "Consulting Dashboard", "nav.statistics": "Statistics",
    "nav.favorites": "Favorites", "nav.settings": "Settings", "nav.help": "Help & Support",
    "nav.tagline": "Explore the world",

    /* Explore page */
    "explore.heading": "Discover your next", "explore.headingAccent": "great adventure",
    "explore.subtitle": "From trending destinations to hidden gems — start your journey here.",
    "explore.3dGlobe": "3D Globe", "explore.3dGlobeDesc": "Explore the world interactively",
    "explore.aiPlanner": "AI Planner", "explore.aiPlannerDesc": "Plan a trip with AI",
    "explore.trending": "Trending", "explore.trendingDesc": "See what's hot right now",
    "explore.trendingNow": "Trending Now", "explore.popularCities": "Popular Cities",

    /* Travel page */
    "travel.discover": "Discover", "travel.heading": "Explore the world's",
    "travel.headingAccent": "most amazing places",
    "travel.subtitle": "Trending destinations, hidden gems, and bucket-list spots curated by millions of travelers.",
    "travel.searchPlaceholder": "Search destinations...", "travel.places": "places",
    "travel.watchVideo": "Watch Video", "travel.noVideo": "No Video",
    "travel.noResults": "No destinations found for", "travel.clearSearch": "Clear search",

    /* Dashboard page */
    "dashboard.greeting": "Hi", "dashboard.subtitle": "Your journey so far, all in one place.",
    "dashboard.yourWishlist": "Your wishlist", "dashboard.wishlistEmpty": "No saved destinations yet. Spin the globe to start dreaming.",
    "dashboard.exploreGlobe": "Explore globe", "dashboard.savedItineraries": "Saved itineraries",
    "dashboard.itinerariesEmpty": "No itineraries yet. Let AI plan your next adventure.",
    "dashboard.openPlanner": "Open planner", "dashboard.days": "days",
    "dashboard.browseServices": "Browse Travel Services", "dashboard.browseServicesDesc": "Visa support, trip planning, honeymoon packages & more",
    "dashboard.recommended": "Recommended for you", "dashboard.tripsPlanned": "Trips planned",

    /* Trips page */
    "trips.heading": "Your saved", "trips.headingAccent": "adventures",
    "trips.saved": "saved", "trips.itinerary": "itinerary", "trips.itineraries": "itineraries",
    "trips.empty": "Plan your first trip and it'll appear here.", "trips.planNew": "Plan a New Trip",
    "trips.more": "more", "trips.estimatedBudget": "Estimated Budget",
    "trips.noTrips": "No trips yet", "trips.noTripsDesc": "Use the AI planner to create your first itinerary. It'll be saved here automatically.",
    "trips.startPlanning": "Start Planning",

    /* Profile page */
    "profile.editProfile": "Edit Profile", "profile.messages": "Messages",
    "profile.posts": "Posts", "profile.followers": "Followers", "profile.following": "Following",
    "profile.createPost": "Create New Travel Post",
    "profile.wantToVisit": "Want to Visit", "profile.visited": "Visited", "profile.favorites": "Favorites",
    "profile.saved": "Saved", "profile.travelMap": "Travel Map", "profile.stories": "Stories",
    "profile.noPosts": "No travel posts yet", "profile.noPostsDesc": "Use the button above to share your first adventure",
    "profile.addStory": "Add Story", "profile.story": "Story",
    "profile.noSaved": "No saved destinations yet", "profile.noSavedDesc": "Explore the globe and save your favorites",
    "profile.exploreGlobe": "Explore globe", "profile.countriesVisited": "countries visited",
    "profile.noArchive": "No story archive yet", "profile.noArchiveDesc": "Your stories will appear here after you create them",

    /* Planner page — extra */
    "planner.heading": "Describe your", "planner.headingAccent": "dream trip.",
    "planner.error": "The planner stumbled", "planner.retry": "Please try again.",
    "planner.saved": "Itinerary saved", "planner.savedDesc": "Find it on your dashboard.",
    "planner.savedBtn": "Saved", "planner.bestTime": "Best time", "planner.dayByDay": "Day by day",
    "planner.morning": "Morning", "planner.afternoon": "Afternoon", "planner.evening": "Evening",
    "planner.budget": "Budget breakdown", "planner.tips": "Insider tips",

    /* Auth page */
    "auth.backToGlobe": "Back to Globe", "auth.comingSoon": "Authentication Coming Soon",
    "auth.comingSoonDesc": "We're configuring Supabase to enable Google, Apple, and email sign-in. While you wait, explore the world freely as a guest.",
    "auth.configInProgress": "Configuration in Progress", "auth.configInProgressDesc": "Supabase setup is being finalized. Check back soon for full account access.",
    "auth.emailPassword": "Email & Password", "auth.emailPasswordDesc": "Classic sign-in with secure password storage",
    "auth.googleSignIn": "Google Sign-In", "auth.googleSignInDesc": "One-tap authentication with your Google account",
    "auth.appleSignIn": "Apple Sign-In", "auth.appleSignInDesc": "Private, secure sign-in with Face ID / Touch ID",
    "auth.soon": "Soon", "auth.continueAsGuest": "Continue as Guest Explorer",
    "auth.guestDesc": "No account needed — explore 200+ countries, plan trips with AI, and discover the world.",
    "auth.fullAuthNote": "Full authentication with Google, Apple, and email will be available after Supabase setup is complete.",
    "auth.travelTheWorld": "Travel the world", "auth.withSafario": "with SAFARIO",
    "auth.featureCountries": "200+ Countries", "auth.featureAIPlanner": "AI Planner",
    "auth.featureLocalGuides": "Local Guides", "auth.featureOfflineMaps": "Offline Maps",
    "auth.bottomTagline": "Discover destinations, plan with AI, and explore every corner of the world — all in one place.",
    "auth.guest": "Guest Explorer",

    /* Common — extra */
    "common.viewAll": "View all", "common.clear": "Clear", "common.remove": "Remove",
  },
  uz: {
    "nav.globe": "Globus", "nav.explore": "Kashf qilish", "nav.travel": "Sayohat",
    "nav.trips": "Sayohatlar", "nav.planner": "Rejalashtiruvchi", "nav.dashboard": "Panel",
    "nav.profile": "Profil",
    "hero.title.line1": "Dunyoni yuqoridan", "hero.title.line2": "tomosha qiling.",
    "hero.subtitle": "Globusni aylantiring, mamlakatlarni kashf eting va AI sizning keyingi sayohatingizni rejalashtirsin.",
    "hero.cta": "AI bilan sayohat rejalashtiring",
    "hero.hint": "Faollashtirish uchun bosing · aylantirish uchun torting · belgini bosib o'rganing",
    "home.featured": "Mashhur yo'nalishlar", "home.countries": "mamlakatlar", "home.signin": "Kirish",
    "planner.title": "AI Sayohat Rejalashtiruvchi", "planner.placeholder": "Orzudagi sayohatingizni tasvirlang...",
    "planner.generate": "Marshrut yaratish", "planner.loading": "Sayohat rejalashtirilmoqda...",
    "dashboard.title": "Panel", "dashboard.wishlist": "Istaklar ro'yxati",
    "dashboard.visited": "Tashrif buyurilgan", "dashboard.itineraries": "Saqlangan marshrutlar",
    "profile.title": "Profil", "profile.signout": "Chiqish",
    "profile.language": "Til", "profile.selectLanguage": "Tilni tanlang",
    "common.back": "Orqaga", "common.loading": "Yuklanmoqda...",
    "common.error": "Xatolik yuz berdi", "common.save": "Saqlash", "common.cancel": "Bekor qilish",

    "settings.title": "Profil Sozlamalari", "settings.subtitle": "SAFARIO tajribangizni sozlang",
    "settings.account": "Hisob", "settings.privacy": "Maxfiylik", "settings.security": "Xavfsizlik",
    "settings.notifications": "Bildirishnomalar", "settings.appearance": "Ko'rinish",
    "settings.offline": "Offlayn Rejim", "settings.travel": "Sayohat Sozlamalari",
    "settings.data": "Ma'lumotlar", "settings.support": "Yordam",
    "settings.editProfile": "Profilni Tahrirlash", "settings.messages": "Xabarlar",
    "settings.admin": "Admin Panel", "settings.username": "Foydalanuvchi nomi",
    "settings.email": "Email Manzil", "settings.unread": "o'qilmagan", "settings.caughtUp": "Hammasi o'qilgan",
    "settings.privateAccount": "Shaxsiy Hisob", "settings.showEmail": "Emailni Ko'rsatish",
    "settings.showFollowers": "Obunachilarni Ko'rsatish", "settings.allowMessages": "Xabarlarga Ruxsat",
    "settings.blockedUsers": "Bloklangan Foydalanuvchilar",
    "settings.changePassword": "Parolni O'zgartirish", "settings.twoFactor": "Ikki Omilli Autentifikatsiya",
    "settings.activeDevices": "Faol Qurilmalar", "settings.loginActivity": "Kirish Faoliyati",
    "settings.biometrics": "Face ID / Touch ID",
    "settings.pushNotif": "Push Bildirishnomalar", "settings.emailNotif": "Email Bildirishnomalar",
    "settings.travelAlerts": "Sayohat Ogohlantirishlari", "settings.aiRecs": "AI Tavsiyalar",
    "settings.darkMode": "Qora Rejim", "settings.lightMode": "Yorug' Rejim",
    "settings.forceOffline": "Offlayn Rejimni Majburlash", "settings.connectionStatus": "Bog'lanish Holati",
    "settings.online": "Onlayn", "settings.offlineStatus": "Offlayn",
    "settings.pendingSync": "Sinxronizatsiya Kutilmoqda", "settings.lastSynced": "Oxirgi Sinxronizatsiya",
    "settings.distanceUnit": "Masafa Birligi", "settings.currency": "Valyuta",
    "settings.timezone": "Vaqt Mintaqasi", "settings.kilometers": "Kilometr", "settings.miles": "Milya",
    "settings.clearCache": "Keshni Tozalash", "settings.downloadData": "Ma'lumotlarni Yuklab Olish",
    "settings.exportHistory": "Sayohat Tarixini Eksport",
    "settings.helpCenter": "Yordam Markazi", "settings.contactSupport": "Yordam Bilan Bog'lanish",
    "settings.reportProblem": "Muammoni Xabar Berish", "settings.sendFeedback": "Fikr Yuborish",
    "settings.about": "SAFARIO Haqida", "settings.logOut": "Chiqish",
    "settings.version": "SAFARIO v1.0.0 — Tadqiqotchilar uchun",

    /* Nav — sidebar */
    "nav.services": "Sayohat Xizmatlari", "nav.premium": "Premium A'zolik",
    "nav.consulting": "Konsalting Paneli", "nav.statistics": "Statistika",
    "nav.favorites": "Sevimlilar", "nav.settings": "Sozlamalar", "nav.help": "Yordam va Qo'llab-quvvatlash",
    "nav.tagline": "Dunyoni o'rganing",

    /* Explore */
    "explore.heading": "Keyingi", "explore.headingAccent": "katta sarguzashtni kashf eting",
    "explore.subtitle": "Mashhur yo'nalishlardan yashirin marvaridlargacha — sayohatingizni shu yerdan boshlang.",
    "explore.3dGlobe": "3D Globus", "explore.3dGlobeDesc": "Dunyoni interaktiv o'rganing",
    "explore.aiPlanner": "AI Rejalashtiruvchi", "explore.aiPlannerDesc": "AI bilan sayohat rejalashtiring",
    "explore.trending": "Mashhur", "explore.trendingDesc": "Hozir nima mashhur",
    "explore.trendingNow": "Hozir Mashhur", "explore.popularCities": "Mashhur Shaharlar",

    /* Travel */
    "travel.discover": "Kashf eting", "travel.heading": "Dunyoning eng ajoyib",
    "travel.headingAccent": "joylarini o'rganing",
    "travel.subtitle": "Mashhur yo'nalishlar, yashirin marvaridlar va orzu manzillar millionlab sayohatchilar tomonidan tanlangan.",
    "travel.searchPlaceholder": "Yo'nalishlarni qidiring...", "travel.places": "joy",
    "travel.watchVideo": " Videoni Ko'rish", "travel.noVideo": "Video Yo'q",
    "travel.noResults": "Bunday yo'nalishlar topilmadi", "travel.clearSearch": "Qidiruvni tozalash",

    /* Dashboard */
    "dashboard.greeting": "Salom", "dashboard.subtitle": "Sayohatingiz hozirgacha, bitta joyda.",
    "dashboard.yourWishlist": "Sizning istaklaringiz", "dashboard.wishlistEmpty": "Hozircha saqlangan yo'nalishlar yo'q. Orzu qilish uchun globusni aylantiring.",
    "dashboard.exploreGlobe": "Globusni o'rganing", "dashboard.savedItineraries": "Saqlangan marshrutlar",
    "dashboard.itinerariesEmpty": "Hozircha marshrutlar yo'q. AI keyingi sayohatingizni rejalashtirsin.",
    "dashboard.openPlanner": "Rejalashtiruvchini ochish", "dashboard.days": "kun",
    "dashboard.browseServices": "Sayohat Xizmatlarini Ko'rish", "dashboard.browseServicesDesc": "Viza qo'llab-quvvatlash, sayohat rejalashtirish, bal oy sayohati paketlari va boshqalar",
    "dashboard.recommended": "Siz uchun tavsiyalar", "dashboard.tripsPlanned": "Rejalashtirilgan sayohatlar",

    /* Trips */
    "trips.heading": "Saqlangan", "trips.headingAccent": "sarguzashtlaringiz",
    "trips.saved": "saqlangan", "trips.itinerary": "marshrut", "trips.itineraries": "marshrutlar",
    "trips.empty": "Birinchi sayohatingizni rejalashtiring va u shu yerda paydo bo'ladi.", "trips.planNew": "Yangi Sayohat Rejalashtirish",
    "trips.more": "boshqa", "trips.estimatedBudget": "Taxminiy Byudjet",
    "trips.noTrips": "Hozircha sayohatlar yo'q", "trips.noTripsDesc": "AI rejalashtiruvchi yordamida birinchi marshrutingizni yarating. U avtomatik ravishda shu yerda saqlanadi.",
    "trips.startPlanning": "Rejalashtirishni Boshlash",

    /* Profile */
    "profile.editProfile": "Profilni Tahrirlash", "profile.messages": "Xabarlar",
    "profile.posts": "Postlar", "profile.followers": "Obunachilar", "profile.following": "Obuna bo'lganlar",
    "profile.createPost": "Yangi Sayohat Posti Yaratish",
    "profile.wantToVisit": "Tashrif Buyurmoqchi", "profile.visited": "Tashrif Buyurilgan", "profile.favorites": "Sevimlilar",
    "profile.saved": "Saqlangan", "profile.travelMap": "Sayohat Xaritasi", "profile.stories": "Hikoyalar",
    "profile.noPosts": "Hozircha sayohat postlari yo'q", "profile.noPostsDesc": "Birinchi sarguzashtingizni ulashish uchun tepadagi tugmadan foydalaning",
    "profile.addStory": "Hikoya Qo'shish", "profile.story": "Hikoya",
    "profile.noSaved": "Hozircha saqlangan yo'nalishlar yo'q", "profile.noSavedDesc": "Globusni o'rganing va sevimlilaringizni saqlang",
    "profile.exploreGlobe": "Globusni o'rganing", "profile.countriesVisited": "mamlakat o'rganilgan",
    "profile.noArchive": "Hozircha hikoya arxivi yo'q", "profile.noArchiveDesc": "Hikoyalaringiz yaratilganidan keyin shu yerda paydo bo'ladi",

    /* Planner */
    "planner.heading": "Orzudagi", "planner.headingAccent": "sayohatingizni tasvirlang.",
    "planner.error": "Rejalashtiruvchi xatolik yuz berdi", "planner.retry": "Iltimos, qaytadan urinib ko'ring.",
    "planner.saved": "Marshrut saqlandi", "planner.savedDesc": "Panelingizdan toping.",
    "planner.savedBtn": "Saqlandi", "planner.bestTime": "Eng yaxshi vaqt", "planner.dayByDay": "Kun bo'yicha",
    "planner.morning": "Ertalab", "planner.afternoon": "Tushdan keyin", "planner.evening": "Kechqurun",
    "planner.budget": "Byudjet tahlili", "planner.tips": "Maslahatlar",

    /* Auth */
    "auth.backToGlobe": "Globusga Qaytish", "auth.comingSoon": "Avtentifikatsiya Tez Orada",
    "auth.comingSoonDesc": "Google, Apple va email orqali kirishni yoqish uchun Supabase sozlanmoqda. Shu paytgoda mehmon sifatida dunyoni erkin o'rganing.",
    "auth.configInProgress": "Sozlash Davom Etmoqda", "auth.configInProgressDesc": "Supabase sozlanmoqda. To'liq hisob ruyhatidan o'tish uchun tez orada qaytadan tekshiring.",
    "auth.emailPassword": "Email va Parol", "auth.emailPasswordDesc": "Xavfsiz parol saqlash bilan klassik kirish",
    "auth.googleSignIn": "Google orqali Kirish", "auth.googleSignInDesc": "Google hisobingiz bilan bir marta bosish orqali kirish",
    "auth.appleSignIn": "Apple orqali Kirish", "auth.appleSignInDesc": "Face ID / Touch ID bilan maxfiy, xavfsiz kirish",
    "auth.soon": "Tez Orada", "auth.continueAsGuest": "Mehmon Tadqiqotchi sifatida Davom Etish",
    "auth.guestDesc": "Hisob kerak emas — 200+ mamlakatni o'rganing, AI bilan sayohat rejalashtiring va dunyoni kashf eting.",
    "auth.fullAuthNote": "Google, Apple va email orqali to'liq avtentifikatsiya Supabase sozlanishi tugagandan keyin mavjud bo'ladi.",
    "auth.travelTheWorld": "Dunyoni sayohat qiling", "auth.withSafario": "SAFARIO bilan",
    "auth.featureCountries": "200+ Mamlakat", "auth.featureAIPlanner": "AI Rejalashtiruvchi",
    "auth.featureLocalGuides": "Mahalliy Yo'riqnomalar", "auth.featureOfflineMaps": "Offlayn Xaritalar",
    "auth.bottomTagline": "Yo'nalishlarni kashf eting, AI bilan rejalashtiring va dunyoning har bir burchagini o'rganing — barchasi bitta joyda.",
    "auth.guest": "Mehmon Tadqiqotchi",

    /* Common */
    "common.viewAll": "Barchasini ko'rish", "common.clear": "Tozalash", "common.remove": "Olib tashlash",
  },
  tr: {
    "nav.globe": "Küre", "nav.explore": "Keşfet", "nav.travel": "Seyahat",
    "nav.trips": "Geziler", "nav.planner": "Planlayıcı", "nav.dashboard": "Panel",
    "nav.profile": "Profil",
    "hero.title.line1": "Dünyayı yukarıdan", "hero.title.line2": "keşfedin.",
    "hero.subtitle": "Küreyi döndürün, ülkeleri keşfedin ve AI bir sonraki kaçamağınızı planlasın.",
    "hero.cta": "AI ile seyahat planla",
    "hero.hint": "Etkinleştirmek için dokun · döndürmek için sürükle · keşfetmek için işarete dokun",
    "home.featured": "Öne çıkan rotalar", "home.countries": "ülke", "home.signin": "Giriş yap",
    "planner.title": "AI Seyahat Planlayıcı", "planner.placeholder": "Hayalindeki seyahati tarif et...",
    "planner.generate": "Rota Oluştur", "planner.loading": "Seyahatin planlanıyor...",
    "dashboard.title": "Panel", "dashboard.wishlist": "İstek listesi",
    "dashboard.visited": "Ziyaret edilenler", "dashboard.itineraries": "Kayıtlı rotalar",
    "profile.title": "Profil", "profile.signout": "Çıkış yap",
    "profile.language": "Dil", "profile.selectLanguage": "Dil seçin",
    "common.back": "Geri", "common.loading": "Yükleniyor...",
    "common.error": "Bir hata oluştu", "common.save": "Kaydet", "common.cancel": "İptal",

    "settings.title": "Profil Ayarları", "settings.subtitle": "SAFARIO deneyiminizi özelleştirin",
    "settings.account": "Hesap", "settings.privacy": "Gizlilik", "settings.security": "Güvenlik",
    "settings.notifications": "Bildirimler", "settings.appearance": "Görünüm",
    "settings.offline": "Çevrimdışı Mod", "settings.travel": "Seyahat Ayarları",
    "settings.data": "Veri", "settings.support": "Destek",
    "settings.editProfile": "Profili Düzenle", "settings.messages": "Mesajlar",
    "settings.admin": "Yönetici Paneli", "settings.username": "Kullanıcı Adı",
    "settings.email": "E-posta Adresi", "settings.unread": "okunmamış", "settings.caughtUp": "Hepsi okundu",
    "settings.privateAccount": "Özel Hesap", "settings.showEmail": "E-postayı Göster",
    "settings.showFollowers": "Takipçileri Göster", "settings.allowMessages": "Mesajlara İzin Ver",
    "settings.blockedUsers": "Engellenen Kullanıcılar",
    "settings.changePassword": "Şifre Değiştir", "settings.twoFactor": "İki Faktörlü Doğrulama",
    "settings.activeDevices": "Aktif Cihazlar", "settings.loginActivity": "Giriş Aktivitesi",
    "settings.biometrics": "Face ID / Touch ID",
    "settings.pushNotif": "Push Bildirimler", "settings.emailNotif": "E-posta Bildirimler",
    "settings.travelAlerts": "Seyahat Uyarıları", "settings.aiRecs": "AI Öneriler",
    "settings.darkMode": "Karanlık Mod", "settings.lightMode": "Aydınlık Mod",
    "settings.forceOffline": "Çevrimdışı Modu Zorla", "settings.connectionStatus": "Bağlantı Durumu",
    "settings.online": "Çevrimiçi", "settings.offlineStatus": "Çevrimdışı",
    "settings.pendingSync": "Senkronizasyon Bekliyor", "settings.lastSynced": "Son Senkronizasyon",
    "settings.distanceUnit": "Mesafe Birimi", "settings.currency": "Para Birimi",
    "settings.timezone": "Saat Dilimi", "settings.kilometers": "Kilometre", "settings.miles": "Mil",
    "settings.clearCache": "Önbelleği Temizle", "settings.downloadData": "Verilerimi İndir",
    "settings.exportHistory": "Seyahat Geçmişini Dışa Aktar",
    "settings.helpCenter": "Yardım Merkezi", "settings.contactSupport": "Destekle İletişim",
    "settings.reportProblem": "Sorun Bildir", "settings.sendFeedback": "Geri Bildirim Gönder",
    "settings.about": "SAFARIO Hakkında", "settings.logOut": "Çıkış Yap",
    "settings.version": "SAFARIO v1.0.0 — Kaşifler için",

    "nav.services": "Seyahat Hizmetleri", "nav.premium": "Premium Üyelik",
    "nav.consulting": "Danışmanlık Paneli", "nav.statistics": "İstatistikler",
    "nav.favorites": "Favoriler", "nav.settings": "Ayarlar", "nav.help": "Yardım ve Destek",
    "nav.tagline": "Dünyayı keşfedin",
    "common.viewAll": "Tümünü gör", "common.clear": "Temizle", "common.remove": "Kaldır",
  },
  ru: {
    "nav.globe": "Глобус", "nav.explore": "Исследовать", "nav.travel": "Путешествия",
    "nav.trips": "Поездки", "nav.planner": "Планировщик", "nav.dashboard": "Панель",
    "nav.profile": "Профиль",
    "hero.title.line1": "Узнай мир", "hero.title.line2": "свысоты.",
    "hero.subtitle": "Вращай глобус, открывай страны и позволь ИИ спланировать твоё следующее путешествие.",
    "hero.cta": "Спланировать поездку с ИИ",
    "hero.hint": "Нажми для активации · тяни для вращения · нажми маркер для исследования",
    "home.featured": "Популярные направления", "home.countries": "стран", "home.signin": "Войти",
    "planner.title": "ИИ-планировщик путешествий", "planner.placeholder": "Опиши поездку мечты...",
    "planner.generate": "Создать маршрут", "planner.loading": "Планируем поездку...",
    "dashboard.title": "Панель", "dashboard.wishlist": "Список желаний",
    "dashboard.visited": "Посещено", "dashboard.itineraries": "Сохранённые маршруты",
    "profile.title": "Профиль", "profile.signout": "Выйти",
    "profile.language": "Язык", "profile.selectLanguage": "Выбрать язык",
    "common.back": "Назад", "common.loading": "Загрузка...",
    "common.error": "Что-то пошло не так", "common.save": "Сохранить", "common.cancel": "Отмена",

    "settings.title": "Настройки Профиля", "settings.subtitle": "Настройте свой SAFARIO",
    "settings.account": "Аккаунт", "settings.privacy": "Приватность", "settings.security": "Безопасность",
    "settings.notifications": "Уведомления", "settings.appearance": "Внешний вид",
    "settings.offline": "Офлайн Режим", "settings.travel": "Настройки Путешествий",
    "settings.data": "Данные", "settings.support": "Поддержка",
    "settings.editProfile": "Редактировать Профиль", "settings.messages": "Сообщения",
    "settings.admin": "Админ Панель", "settings.username": "Имя пользователя",
    "settings.email": "Email Адрес", "settings.unread": "непрочитано", "settings.caughtUp": "Всё прочитано",
    "settings.privateAccount": "Приватный Аккаунт", "settings.showEmail": "Показать Email",
    "settings.showFollowers": "Показать Подписчиков", "settings.allowMessages": "Разрешить Сообщения",
    "settings.blockedUsers": "Заблокированные Пользователи",
    "settings.changePassword": "Изменить Пароль", "settings.twoFactor": "Двухфакторная Аутентификация",
    "settings.activeDevices": "Активные Устройства", "settings.loginActivity": "История Входов",
    "settings.biometrics": "Face ID / Touch ID",
    "settings.pushNotif": "Push Уведомления", "settings.emailNotif": "Email Уведомления",
    "settings.travelAlerts": "Оповещения о Путешествиях", "settings.aiRecs": "AI Рекомендации",
    "settings.darkMode": "Тёмная Тема", "settings.lightMode": "Светлая Тема",
    "settings.forceOffline": "Принудительный Офлайн", "settings.connectionStatus": "Статус Соединения",
    "settings.online": "Онлайн", "settings.offlineStatus": "Офлайн",
    "settings.pendingSync": "Ожидает Синхронизации", "settings.lastSynced": "Последняя Синхронизация",
    "settings.distanceUnit": "Единица Расстояния", "settings.currency": "Валюта",
    "settings.timezone": "Часовой Пояс", "settings.kilometers": "Километры", "settings.miles": "Мили",
    "settings.clearCache": "Очистить Кэш", "settings.downloadData": "Скачать Мои Данные",
    "settings.exportHistory": "Экспорт Истории Путешествий",
    "settings.helpCenter": "Центр Помощи", "settings.contactSupport": "Связаться с Поддержкой",
    "settings.reportProblem": "Сообщить о Проблеме", "settings.sendFeedback": "Отправить Отзыв",
    "settings.about": "О SAFARIO", "settings.logOut": "Выйти",
    "settings.version": "SAFARIO v1.0.0 — Для исследователей",

    "nav.services": "Туристические Услуги", "nav.premium": "Премиум Подписка",
    "nav.consulting": "Панель Консалтинга", "nav.statistics": "Статистика",
    "nav.favorites": "Избранное", "nav.settings": "Настройки", "nav.help": "Помощь и Поддержка",
    "nav.tagline": "Исследуйте мир",
    "common.viewAll": "Смотреть все", "common.clear": "Очистить", "common.remove": "Удалить",
  },
  ar: {
    "nav.globe": "الكرة الأرضية", "nav.explore": "استكشف", "nav.travel": "سفر",
    "nav.trips": "رحلات", "nav.planner": "مخطط", "nav.dashboard": "لوحة التحكم",
    "nav.profile": "الملف الشخصي",
    "hero.title.line1": "شاهد العالم", "hero.title.line2": "من الأعلى.",
    "hero.subtitle": "أدر الكرة الأرضية، اكتشف الدول، ودع الذكاء الاصطناعي يخطط رحلتك القادمة.",
    "hero.cta": "خطط لرحلة بالذكاء الاصطناعي",
    "hero.hint": "انقر للتفعيل · اسحب للدوران · انقر علامة للاستكشاف",
    "home.featured": "وجهات مميزة", "home.countries": "دولة", "home.signin": "تسجيل الدخول",
    "planner.title": "مخطط رحلات الذكاء الاصطناعي", "planner.placeholder": "صف رحلة أحلامك...",
    "planner.generate": "إنشاء مسار", "planner.loading": "نخطط رحلتك...",
    "dashboard.title": "لوحة التحكم", "dashboard.wishlist": "قائمة الرغبات",
    "dashboard.visited": "تمت زيارتها", "dashboard.itineraries": "المسارات المحفوظة",
    "profile.title": "الملف الشخصي", "profile.signout": "تسجيل الخروج",
    "profile.language": "اللغة", "profile.selectLanguage": "اختر اللغة",
    "common.back": "رجوع", "common.loading": "جار التحميل...",
    "common.error": "حدث خطأ ما", "common.save": "حفظ", "common.cancel": "إلغاء",

    "settings.title": "إعدادات الملف الشخصي", "settings.subtitle": "خصص تجربة SAFARIO",
    "settings.account": "الحساب", "settings.privacy": "الخصوصية", "settings.security": "الأمان",
    "settings.notifications": "الإشعارات", "settings.appearance": "المظهر",
    "settings.offline": "وضع عدم الاتصال", "settings.travel": "إعدادات السفر",
    "settings.data": "البيانات", "settings.support": "الدعم",
    "settings.editProfile": "تعديل الملف الشخصي", "settings.messages": "الرسائل",
    "settings.admin": "لوحة الإدارة", "settings.username": "اسم المستخدم",
    "settings.email": "البريد الإلكتروني", "settings.unread": "غير مقروء", "settings.caughtUp": "تمت القراءة",
    "settings.privateAccount": "حساب خاص", "settings.showEmail": "إظهار البريد",
    "settings.showFollowers": "إظهار المتابعين", "settings.allowMessages": "السماح بالرسائل",
    "settings.blockedUsers": "المستخدمون المحظورون",
    "settings.changePassword": "تغيير كلمة المرور", "settings.twoFactor": "المصادقة الثنائية",
    "settings.activeDevices": "الأجهزة النشطة", "settings.loginActivity": "نشاط تسجيل الدخول",
    "settings.biometrics": "Face ID / Touch ID",
    "settings.pushNotif": "إشعارات فورية", "settings.emailNotif": "إشعارات البريد",
    "settings.travelAlerts": "تنبيهات السفر", "settings.aiRecs": "توصيات AI",
    "settings.darkMode": "الوضع الداكن", "settings.lightMode": "الوضع الفاتح",
    "settings.forceOffline": "فرض وضع عدم الاتصال", "settings.connectionStatus": "حالة الاتصال",
    "settings.online": "متصل", "settings.offlineStatus": "غير متصل",
    "settings.pendingSync": "مزامنة معلقة", "settings.lastSynced": "آخر مزامنة",
    "settings.distanceUnit": "وحدة المسافة", "settings.currency": "العملة",
    "settings.timezone": "المنطقة الزمنية", "settings.kilometers": "كيلومتر", "settings.miles": "ميل",
    "settings.clearCache": "مسح ذاكرة التخزين", "settings.downloadData": "تنزيل بياناتي",
    "settings.exportHistory": "تصدير سجل السفر",
    "settings.helpCenter": "مركز المساعدة", "settings.contactSupport": "تواصل مع الدعم",
    "settings.reportProblem": "الإبلاغ عن مشكلة", "settings.sendFeedback": "إرسال ملاحظات",
    "settings.about": "حول SAFARIO", "settings.logOut": "تسجيل الخروج",
    "settings.version": "SAFARIO v1.0.0 — للمستكشفين",

    "nav.services": "خدمات السفر", "nav.premium": "العضوية المميزة",
    "nav.consulting": "لوحة الاستشارات", "nav.statistics": "الإحصائيات",
    "nav.favorites": "المفضلة", "nav.settings": "الإعدادات", "nav.help": "المساعدة والدعم",
    "nav.tagline": "استكشف العالم",
    "common.viewAll": "عرض الكل", "common.clear": "مسح", "common.remove": "إزالة",
  },
  de: {
    "nav.globe": "Globus", "nav.explore": "Entdecken", "nav.travel": "Reisen",
    "nav.trips": "Reisen", "nav.planner": "Planer", "nav.dashboard": "Dashboard",
    "nav.profile": "Profil",
    "hero.title.line1": "Sieh die Welt", "hero.title.line2": "von oben.",
    "hero.subtitle": "Dreh den Globus, entdecke Länder und lass KI deine nächste große Reise planen.",
    "hero.cta": "Reise mit KI planen",
    "hero.hint": "Zum Aktivieren tippen · zum Drehen ziehen · Marker antippen zum Erkunden",
    "home.featured": "Beliebte Reiseziele", "home.countries": "Länder", "home.signin": "Anmelden",
    "planner.title": "KI-Reiseplaner", "planner.loading": "Reise wird geplant...",
    "dashboard.title": "Dashboard", "profile.title": "Profil",
    "profile.signout": "Abmelden", "profile.language": "Sprache", "profile.selectLanguage": "Sprache wählen",
    "common.back": "Zurück", "common.loading": "Lädt...",
    "common.save": "Speichern", "common.cancel": "Abbrechen",
  },
  fr: {
    "nav.globe": "Globe", "nav.explore": "Explorer", "nav.travel": "Voyager",
    "nav.trips": "Voyages", "nav.planner": "Planificateur", "nav.dashboard": "Tableau",
    "nav.profile": "Profil",
    "hero.title.line1": "Voyez le monde", "hero.title.line2": "d'en haut.",
    "hero.subtitle": "Faites tourner le globe, découvrez des pays et laissez l'IA planifier votre prochaine évasion.",
    "hero.cta": "Planifiez un voyage avec l'IA",
    "hero.hint": "Touchez pour activer · glissez pour tourner · touchez un marqueur pour explorer",
    "home.featured": "Destinations en vedette", "home.countries": "pays", "home.signin": "Se connecter",
    "planner.title": "Planificateur IA", "planner.placeholder": "Décrivez votre voyage de rêve...",
    "planner.generate": "Générer l'itinéraire", "planner.loading": "Planification en cours...",
    "dashboard.title": "Tableau de bord", "dashboard.wishlist": "Liste de souhaits",
    "dashboard.visited": "Visités", "dashboard.itineraries": "Itinéraires sauvegardés",
    "profile.title": "Profil", "profile.signout": "Déconnexion",
    "profile.language": "Langue", "profile.selectLanguage": "Choisir la langue",
    "common.back": "Retour", "common.loading": "Chargement...",
    "common.error": "Quelque chose s'est mal passé", "common.save": "Enregistrer", "common.cancel": "Annuler",
  },
  es: {
    "nav.globe": "Globo", "nav.explore": "Explorar", "nav.travel": "Viajar",
    "nav.trips": "Viajes", "nav.planner": "Planificador", "nav.dashboard": "Panel",
    "nav.profile": "Perfil",
    "hero.title.line1": "Ve el mundo", "hero.title.line2": "desde arriba.",
    "hero.subtitle": "Gira el globo, descubre países y deja que la IA planifique tu próxima gran escapada.",
    "hero.cta": "Planifica un viaje con IA",
    "hero.hint": "Toca para activar · arrastra para girar · toca un marcador para explorar",
    "home.featured": "Destinos destacados", "home.countries": "países", "home.signin": "Iniciar sesión",
    "planner.title": "Planificador de Viajes IA", "planner.placeholder": "Describe el viaje de tus sueños...",
    "planner.generate": "Generar Itinerario", "planner.loading": "Planificando tu viaje...",
    "dashboard.title": "Panel", "dashboard.wishlist": "Lista de deseos",
    "dashboard.visited": "Visitados", "dashboard.itineraries": "Itinerarios guardados",
    "profile.title": "Perfil", "profile.signout": "Cerrar sesión",
    "profile.language": "Idioma", "profile.selectLanguage": "Seleccionar idioma",
    "common.back": "Volver", "common.loading": "Cargando...",
    "common.error": "Algo salió mal", "common.save": "Guardar", "common.cancel": "Cancelar",
  },
  it: {
    "nav.globe": "Globo", "nav.explore": "Esplora", "nav.travel": "Viaggi",
    "nav.trips": "Itinerari", "nav.planner": "Pianificatore", "nav.dashboard": "Cruscotto",
    "nav.profile": "Profilo",
    "hero.title.line1": "Guarda il mondo", "hero.title.line2": "dall'alto.",
    "hero.subtitle": "Ruota il globo, scopri paesi e lascia che l'IA pianifichi la tua prossima avventura.",
    "hero.cta": "Pianifica un viaggio con l'IA",
    "hero.hint": "Tocca per attivare · trascina per ruotare · tocca un marker per esplorare",
    "home.featured": "Destinazioni in evidenza", "home.countries": "paesi", "home.signin": "Accedi",
    "planner.title": "Pianificatore di viaggi IA", "planner.placeholder": "Descrivi il viaggio dei tuoi sogni...",
    "planner.generate": "Genera itinerario", "planner.loading": "Pianificazione del viaggio...",
    "dashboard.title": "Cruscotto", "dashboard.wishlist": "Lista dei desideri",
    "dashboard.visited": "Visitati", "dashboard.itineraries": "Itinerari salvati",
    "profile.title": "Profilo", "profile.signout": "Esci",
    "profile.language": "Lingua", "profile.selectLanguage": "Seleziona lingua",
    "common.back": "Indietro", "common.loading": "Caricamento...",
    "common.error": "Si è verificato un errore", "common.save": "Salva", "common.cancel": "Annulla",
  },
  pt: {
    "nav.globe": "Globo", "nav.explore": "Explorar", "nav.travel": "Viajar",
    "nav.trips": "Viagens", "nav.planner": "Planejador", "nav.dashboard": "Painel",
    "nav.profile": "Perfil",
    "hero.title.line1": "Veja o mundo", "hero.title.line2": "de cima.",
    "hero.subtitle": "Gire o globo, descubra países e deixe a IA planejar sua próxima grande viagem.",
    "hero.cta": "Planeje uma viagem com IA",
    "hero.hint": "Toque para ativar · arraste para girar · toque num marcador para explorar",
    "home.featured": "Destinos em destaque", "home.countries": "países", "home.signin": "Entrar",
    "planner.title": "Planejador de viagens IA", "planner.placeholder": "Descreva a viagem dos seus sonhos...",
    "planner.generate": "Gerar itinerário", "planner.loading": "Planejando sua viagem...",
    "dashboard.title": "Painel", "dashboard.wishlist": "Lista de desejos",
    "dashboard.visited": "Visitados", "dashboard.itineraries": "Itinerários salvos",
    "profile.title": "Perfil", "profile.signout": "Sair",
    "profile.language": "Idioma", "profile.selectLanguage": "Selecionar idioma",
    "common.back": "Voltar", "common.loading": "Carregando...",
    "common.error": "Algo deu errado", "common.save": "Salvar", "common.cancel": "Cancelar",
  },
  zh: {
    "nav.globe": "地球仪", "nav.explore": "探索", "nav.travel": "旅行",
    "nav.trips": "行程", "nav.planner": "规划器", "nav.dashboard": "仪表板",
    "nav.profile": "个人资料",
    "hero.title.line1": "从上方", "hero.title.line2": "看世界。",
    "hero.subtitle": "转动地球仪，发现国家，让AI为您规划下一次旅行。",
    "hero.cta": "用AI规划旅行",
    "hero.hint": "点击激活 · 拖动旋转 · 点击标记探索",
    "home.featured": "精选目的地", "home.countries": "个国家", "home.signin": "登录",
    "planner.title": "AI旅行规划器", "planner.placeholder": "描述您梦想的旅行...",
    "planner.generate": "生成行程", "planner.loading": "正在规划旅行...",
    "dashboard.title": "仪表板", "dashboard.wishlist": "心愿单",
    "dashboard.visited": "已访问", "dashboard.itineraries": "已保存行程",
    "profile.title": "个人资料", "profile.signout": "退出",
    "profile.language": "语言", "profile.selectLanguage": "选择语言",
    "common.back": "返回", "common.loading": "加载中...",
    "common.error": "出错了", "common.save": "保存", "common.cancel": "取消",
  },
  ja: {
    "nav.globe": "地球儀", "nav.explore": "探検", "nav.travel": "旅行",
    "nav.trips": "旅", "nav.planner": "プランナー", "nav.dashboard": "ダッシュボード",
    "nav.profile": "プロフィール",
    "hero.title.line1": "世界を眺めよう", "hero.title.line2": "上空から。",
    "hero.subtitle": "地球を回して国を見つけ、AIに次の冒険を計画してもらいましょう。",
    "hero.cta": "AIで旅を計画する",
    "hero.hint": "タップして有効化・ドラッグで回転・マーカーをタップして探索",
    "home.featured": "おすすめの目的地", "home.countries": "ヶ国", "home.signin": "サインイン",
    "planner.title": "AI旅行プランナー", "planner.loading": "旅を計画中...",
    "dashboard.title": "ダッシュボード", "profile.title": "プロフィール",
    "profile.signout": "サインアウト", "profile.language": "言語", "profile.selectLanguage": "言語を選択",
    "common.back": "戻る", "common.loading": "読み込み中...",
    "common.save": "保存", "common.cancel": "キャンセル",
  },
  ko: {
    "nav.globe": "지구본", "nav.explore": "탐험", "nav.travel": "여행",
    "nav.trips": "여행", "nav.planner": "플래너", "nav.dashboard": "대시보드",
    "nav.profile": "프로필",
    "hero.title.line1": "세상을 위에서", "hero.title.line2": "바라봐요.",
    "hero.subtitle": "지구본을 돌리고, 국가를 발견하고, AI가 다음 여행을 계획하게 하세요.",
    "hero.cta": "AI로 여행 계획하기",
    "hero.hint": "탭하여 활성화 · 드래그하여 회전 · 마커를 탭하여 탐험",
    "home.featured": "추천 여행지", "home.countries": "개국", "home.signin": "로그인",
    "planner.title": "AI 여행 플래너", "planner.loading": "여행 계획 중...",
    "dashboard.title": "대시보드", "profile.title": "프로필",
    "profile.signout": "로그아웃", "profile.language": "언어", "profile.selectLanguage": "언어 선택",
    "common.back": "뒤로", "common.loading": "로딩 중...",
    "common.save": "저장", "common.cancel": "취소",
  },
  hi: {
    "nav.globe": "ग्लोब", "nav.explore": "खोज", "nav.travel": "यात्रा",
    "nav.trips": "यात्राएं", "nav.planner": "योजनाकार", "nav.dashboard": "डैशबोर्ड",
    "nav.profile": "प्रोफ़ाइल",
    "hero.title.line1": "दुनिया को ऊपर से", "hero.title.line2": "देखें।",
    "hero.subtitle": "ग्लोब घुमाएं, देशों की खोज करें और अपनी अगली यात्रा की योजना AI से बनवाएं।",
    "hero.cta": "AI के साथ यात्रा योजना बनाएं",
    "hero.hint": "सक्रिय करने के लिए टैप करें · घुमाने के लिए खींचें · खोजने के लिए मार्कर टैप करें",
    "home.featured": "प्रदर्शित गंतव्य", "home.countries": "देश", "home.signin": "साइन इन",
    "planner.title": "AI यात्रा योजनाकार", "planner.placeholder": "अपनी सपनों की यात्रा का वर्णन करें...",
    "planner.generate": "यात्रा योजना बनाएं", "planner.loading": "यात्रा योजना बन रही है...",
    "dashboard.title": "डैशबोर्ड", "dashboard.wishlist": "इच्छा सूची",
    "dashboard.visited": "भ्रमण किए गए", "dashboard.itineraries": "सहेजे गए यात्रा कार्यक्रम",
    "profile.title": "प्रोफ़ाइल", "profile.signout": "साइन आउट",
    "profile.language": "भाषा", "profile.selectLanguage": "भाषा चुनें",
    "common.back": "वापस", "common.loading": "लोड हो रहा है...",
    "common.error": "कुछ गलत हो गया", "common.save": "सहेजें", "common.cancel": "रद्द करें",
  },
  fa: {
    "nav.globe": "کره زمین", "nav.explore": "کاوش", "nav.travel": "سفر",
    "nav.trips": "سفرها", "nav.planner": "برنامه‌ریز", "nav.dashboard": "داشبورد",
    "nav.profile": "پروفایل",
    "hero.title.line1": "جهان را از بالا", "hero.title.line2": "ببینید.",
    "hero.subtitle": "کره را بچرخانید، کشورها را کشف کنید و هوش مصنوعی سفر بعدی شما را برنامه‌ریزی کند.",
    "hero.cta": "سفر را با هوش مصنوعی برنامه‌ریزی کنید",
    "hero.hint": "برای فعال‌سازی لمس کنید · برای چرخش بکشید · برای کاوش نشان را لمس کنید",
    "home.featured": "مقاصد محبوب", "home.countries": "کشور", "home.signin": "ورود",
    "planner.title": "برنامه‌ریز سفر هوش مصنوعی", "planner.placeholder": "سفر رویایی خود را توصیف کنید...",
    "planner.generate": "برنامه سفر بسازید", "planner.loading": "در حال برنامه‌ریزی سفر...",
    "dashboard.title": "داشبورد", "dashboard.wishlist": "لیست آرزوها",
    "dashboard.visited": "دیده‌شده", "dashboard.itineraries": "برنامه‌های سفر ذخیره شده",
    "profile.title": "پروفایل", "profile.signout": "خروج",
    "profile.language": "زبان", "profile.selectLanguage": "زبان را انتخاب کنید",
    "common.back": "بازگشت", "common.loading": "در حال بارگذاری...",
    "common.error": "خطایی رخ داد", "common.save": "ذخیره", "common.cancel": "لغو",
  },
  kk: {
    "nav.globe": "Глобус", "nav.explore": "Зерттеу", "nav.travel": "Саяхат",
    "nav.trips": "Саяхаттар", "nav.planner": "Жоспарлаушы", "nav.dashboard": "Басқару тақтасы",
    "nav.profile": "Профиль",
    "hero.title.line1": "Әлемді жоғарыдан", "hero.title.line2": "көріңіз.",
    "hero.subtitle": "Глобусты бұраңыз, елдерді ашыңыз және ЖИ сіздің келесі саяхатыңызды жоспарласын.",
    "hero.cta": "ЖИ арқылы саяхат жоспарлаңыз",
    "hero.hint": "Белсендіру үшін түртіңіз · бұру үшін сырыңыз · зерттеу үшін белгіні түртіңіз",
    "home.featured": "Танымал бағыттар", "home.countries": "ел", "home.signin": "Кіру",
    "planner.title": "ЖИ саяхат жоспарлаушысы", "planner.placeholder": "Армандаған саяхатыңызды сипаттаңыз...",
    "planner.generate": "Маршрут құру", "planner.loading": "Саяхат жоспарлануда...",
    "dashboard.title": "Басқару тақтасы", "dashboard.wishlist": "Тілектер тізімі",
    "dashboard.visited": "Барылған", "dashboard.itineraries": "Сақталған маршруттар",
    "profile.title": "Профиль", "profile.signout": "Шығу",
    "profile.language": "Тіл", "profile.selectLanguage": "Тілді таңдаңыз",
    "common.back": "Артқа", "common.loading": "Жүктелуде...",
    "common.error": "Қате орын алды", "common.save": "Сақтау", "common.cancel": "Бас тарту",
  },
  ky: {
    "nav.globe": "Глобус", "nav.explore": "Изилдөө", "nav.travel": "Саякат",
    "nav.trips": "Саякаттар", "nav.planner": "Планлоочу", "nav.dashboard": "Башкаруу панели",
    "nav.profile": "Профиль",
    "hero.title.line1": "Дүйнөнү үстүнөн", "hero.title.line2": "көрүңүз.",
    "hero.subtitle": "Глобусту айландырыңыз, өлкөлөрдү табыңыз жана ЖИ кийинки саякатыңызды пландаштырсын.",
    "hero.cta": "ЖИ менен саякат пландаштырыңыз",
    "hero.hint": "Активдештирүү үчүн басыңыз · айлантуу үчүн сүйрөңүз · изилдөө үчүн белгини басыңыз",
    "home.featured": "Тандалган багыттар", "home.countries": "өлкө", "home.signin": "Кирүү",
    "planner.title": "ЖИ саякат планлоочусу", "planner.placeholder": "Эң сонун саякатыңызды сүрөттөңүз...",
    "planner.generate": "Маршрут түзүү", "planner.loading": "Саякат пландаштырылууда...",
    "dashboard.title": "Башкаруу панели", "dashboard.wishlist": "Каалоолор тизмеси",
    "dashboard.visited": "Барган", "dashboard.itineraries": "Сакталган маршруттар",
    "profile.title": "Профиль", "profile.signout": "Чыгуу",
    "profile.language": "Тил", "profile.selectLanguage": "Тилди тандыңыз",
    "common.back": "Артка", "common.loading": "Жүктөлүүдө...",
    "common.error": "Бир нерсеси ката кетти", "common.save": "Сактоо", "common.cancel": "Жокко чыгаруу",
  },
  tg: {
    "nav.globe": "Глобус", "nav.explore": "Таҳқиқ", "nav.travel": "Сафар",
    "nav.trips": "Сафарҳо", "nav.planner": "Нақшабанд", "nav.dashboard": "Панел",
    "nav.profile": "Профил",
    "hero.title.line1": "Ҷаҳонро аз боло", "hero.title.line2": "бубинед.",
    "hero.subtitle": "Глобусро бичархед, кишварҳоро кашф кунед ва ЗҲ нақшаи сафари ояндаатонро тартиб диҳад.",
    "hero.cta": "Бо ЗҲ нақшаи сафар созед",
    "hero.hint": "Барои фаъол кардан ламс кунед · барои чархондан кашед · барои таҳқиқ нишонро ламс кунед",
    "home.featured": "Самтҳои маъруф", "home.countries": "кишвар", "home.signin": "Вуруд",
    "planner.title": "Нақшабанди сафари ЗҲ", "planner.placeholder": "Сафари хоби худро тавсиф кунед...",
    "planner.generate": "Нақша эҷод кардан", "planner.loading": "Нақшаи сафар тартиб дода истодааст...",
    "dashboard.title": "Панел", "dashboard.wishlist": "Рӯйхати орзуҳо",
    "dashboard.visited": "Боздидшуда", "dashboard.itineraries": "Нақшаҳои нигоҳдошташуда",
    "profile.title": "Профил", "profile.signout": "Баромад",
    "profile.language": "Забон", "profile.selectLanguage": "Забонро интихоб кунед",
    "common.back": "Бозгашт", "common.loading": "Дар борборӣ...",
    "common.error": "Хато рух дод", "common.save": "Нигоҳ доштан", "common.cancel": "Бекор кардан",
  },
  uk: {
    "nav.globe": "Глобус", "nav.explore": "Досліджувати", "nav.travel": "Подорожі",
    "nav.trips": "Поїздки", "nav.planner": "Планувальник", "nav.dashboard": "Панель",
    "nav.profile": "Профіль",
    "hero.title.line1": "Побач світ", "hero.title.line2": "згори.",
    "hero.subtitle": "Оберто глобус, відкривай країни й дозволь ШІ спланувати твою наступну подорож.",
    "hero.cta": "Спланувати подорож зі ШІ",
    "hero.hint": "Торкни для активації · тягни для обертання · торкни маркер для дослідження",
    "home.featured": "Популярні напрямки", "home.countries": "країн", "home.signin": "Увійти",
    "planner.title": "ШІ-планувальник подорожей", "planner.placeholder": "Опиши свою подорож мрії...",
    "planner.generate": "Згенерувати маршрут", "planner.loading": "Плануємо твою подорож...",
    "dashboard.title": "Панель", "dashboard.wishlist": "Список бажань",
    "dashboard.visited": "Відвідані", "dashboard.itineraries": "Збережені маршрути",
    "profile.title": "Профіль", "profile.signout": "Вийти",
    "profile.language": "Мова", "profile.selectLanguage": "Вибрати мову",
    "common.back": "Назад", "common.loading": "Завантаження...",
    "common.error": "Щось пішло не так", "common.save": "Зберегти", "common.cancel": "Скасувати",
  },
  az: {
    "nav.globe": "Kürə", "nav.explore": "Kəşf et", "nav.travel": "Səyahət",
    "nav.trips": "Səfərlər", "nav.planner": "Planlayıcı", "nav.dashboard": "Panel",
    "nav.profile": "Profil",
    "hero.title.line1": "Dünyanı yuxarıdan", "hero.title.line2": "gör.",
    "hero.subtitle": "Kürəni fırladın, ölkələri kəşf edin və AI növbəti səyahətinizi planlaşdırsın.",
    "hero.cta": "AI ilə səyahət planlaşdırın",
    "hero.hint": "Aktivləşdirmək üçün toxunun · fırlatmaq üçün sürüşdürün · kəşf etmək üçün işarəyə toxunun",
    "home.featured": "Seçilən istiqamətlər", "home.countries": "ölkə", "home.signin": "Daxil ol",
    "planner.title": "AI Səyahət Planlayıcısı", "planner.placeholder": "Arzu etdiyiniz səyahəti təsvir edin...",
    "planner.generate": "Marşrut yarat", "planner.loading": "Səyahət planlaşdırılır...",
    "dashboard.title": "Panel", "dashboard.wishlist": "Arzu siyahısı",
    "dashboard.visited": "Ziyarət edilən", "dashboard.itineraries": "Saxlanmış marşrutlar",
    "profile.title": "Profil", "profile.signout": "Çıxış",
    "profile.language": "Dil", "profile.selectLanguage": "Dil seçin",
    "common.back": "Geri", "common.loading": "Yüklənir...",
    "common.error": "Bir xəta baş verdi", "common.save": "Saxla", "common.cancel": "Ləğv et",
  },
};
