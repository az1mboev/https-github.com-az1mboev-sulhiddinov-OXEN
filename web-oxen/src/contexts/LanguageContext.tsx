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

const STORAGE_KEY = "oxen.language";

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
