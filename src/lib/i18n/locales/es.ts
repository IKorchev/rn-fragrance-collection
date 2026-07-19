import type { Dictionary } from "../types"

// Neutral (Latin American-leaning) Spanish — avoids regionalisms (e.g. "tú"
// over "vos"/"usted") so it reads naturally across the whole Spanish-speaking
// user base rather than one specific country.
const es: Dictionary = {
  common: {
    cancel: "Cancelar",
    close: "Cerrar",
    share: "Compartir",
    done: "Listo",
    ok: "Aceptar",
    loading: "Cargando…",
  },

  screens: {
    wearHistory: "Diario de aromas",
    privacyPolicy: "Política de privacidad",
    terms: "Términos y condiciones",
    badges: "Muro de insignias",
  },

  profile: {
    title: "Perfil",
    anonymous: "Anónimo",
    memberSince: "Miembro desde {{date}}",
    stats: {
      inCollection: "En tu colección",
      totalWears: "Usos totales",
      thisMonth: "Este mes",
      dayStreak_one: "Día de racha",
      dayStreak_other: "Días de racha",
    },
    mostWornLabel: "Más usado:",
    mostWornCount: "({{count}}x)",
    upgradeToPro: "Actualizar a Pro",
    viewPaywallDev: "Ver muro de pago (dev)",
    toastWelcomePro: "¡Bienvenido a Pro!",
    toastPurchasesRestored: "Compras restauradas",
    wearHistoryRow: "Diario de aromas",
    moderationQueue: "Cola de moderación",
    sectionActivity: "Actividad",
    sectionPreferences: "Preferencias",
    sectionAccount: "Cuenta",
    freeCollectionLimit: "{{count}}/{{limit}} en tu colección gratuita",
    gettingStartedGuide: "Guía de introducción",
    exportData: "Exportar tus datos",
    appearance: "Apariencia",
    appearanceSystem: "Igual que el sistema",
    appearanceLight: "Claro",
    appearanceDark: "Oscuro",
    dailyReminder: "Recordatorio diario",
    reminderUpdateFailedTitle: "Ups",
    reminderUpdateFailedMessage: "No se pudo actualizar tu recordatorio, inténtalo de nuevo.",
    language: "Idioma",
    shareRecap: "Compartir mi resumen",
    shareToday: "Compartir el perfume de hoy",
    signOut: "Cerrar sesión",
    deleteAccount: "Eliminar cuenta",
    deletingAccount: "Eliminando cuenta…",
    deleteConfirmTitle: "¿Eliminar cuenta?",
    deleteConfirmMessage:
      "Esto elimina permanentemente tu cuenta, colección y diario de aromas. Esta acción no se puede deshacer.",
    deleteConfirmConfirm: "Eliminar",
    deleteFailedTitle: "No se pudo eliminar",
    deleteFailedMessage: "Algo salió mal, inténtalo de nuevo más tarde.",
  },

  language: {
    title: "Idioma",
    system: "Predeterminado del sistema",
    english: "English",
    spanish: "Español",
  },

  gamification: {
    header: {
      levelLabel: "Nivel {{level}}",
      xpToNext: "{{current}}/{{target}} XP para el siguiente nivel",
      maxLevelXp: "{{xp}} XP en total · Nivel máximo",
      streakLabel_one: "Racha de {{count}} día",
      streakLabel_other: "Racha de {{count}} días",
      badgesEarned: "{{count}}/{{total}} insignias",
    },

    levels: {
      "1": "Olfateador Novato",
      "2": "Explorador de Aromas",
      "3": "Aprendiz de Fragancias",
      "4": "Entusiasta del Perfume",
      "5": "Táctico de Salida",
      "6": "Conocedor del Sillage",
      "7": "Maestro Perfumista",
      "8": "Sabio Olfativo",
      "9": "Virtuoso del Aroma",
      "10": "La Nariz",
    },

    badgeWall: {
      title: "Muro de insignias",
      sectionStreak: "Rachas",
      sectionWears: "Usos",
      sectionCollection: "Colección",
      sectionExplorer: "Explorador",
      sectionSpecial: "Especiales",
      lockedProgress: "{{current}}/{{target}}",
      seeAllRow: "Ver todas las insignias",
      recentlyEarned: "Ganadas recientemente",
      almostThere: "Casi lo logras",
      emptyTitle: "Aún no hay insignias",
      emptyMessage: "Registra un uso para empezar a ganar insignias.",
    },

    toasts: {
      levelUp: "¡Subiste de nivel! Ahora eres {{title}} 🎉",
      badgeUnlocked: "Insignia desbloqueada: {{name}} 🏅",
    },

    badges: {
      "streak-3": {
        name: "Calentando Motores",
        description: "Usa un perfume 3 días seguidos.",
      },
      "streak-7": {
        name: "Semana de Aromas",
        description: "Alcanza una racha de 7 días.",
      },
      "streak-30": {
        name: "Hábito Aromático",
        description: "Mantén una racha de 30 días.",
      },
      "streak-100": {
        name: "Nariz Centenaria",
        description: "Llega a una racha de 100 días. Ya es oficial: es una adicción.",
      },
      "wears-1": {
        name: "Primer Toque",
        description: "Registra tu primer uso.",
      },
      "wears-25": {
        name: "Agarrando el Ritmo",
        description: "Registra 25 usos.",
      },
      "wears-100": {
        name: "Triple Dígito",
        description: "Registra 100 usos.",
      },
      "wears-500": {
        name: "Máquina de Perfumar",
        description: "Registra 500 usos. ¿Estás bien?",
      },
      "collection-5": {
        name: "Estante Inicial",
        description: "Agrega 5 perfumes a tu colección.",
      },
      "collection-15": {
        name: "Armando el Armario",
        description: "Haz crecer tu colección a 15 perfumes.",
      },
      "collection-40": {
        name: "Coleccionista Empedernido",
        description: "Haz crecer tu colección a 40 perfumes.",
      },
      "explorer-3": {
        name: "Curioso de Marcas",
        description: "Usa perfumes de 3 marcas distintas.",
      },
      "explorer-8": {
        name: "Nariz Viajera",
        description: "Usa perfumes de 8 marcas distintas.",
      },
      "explorer-15": {
        name: "Pasaporte Perfumado",
        description: "Usa perfumes de 15 marcas distintas.",
      },
      "special-dusted-off": {
        name: "Desempolvado",
        description: "Vuelve a usar un perfume tras 30+ días guardado.",
      },
      "special-loyalist": {
        name: "Fiel de Corazón",
        description: "Usa el mismo perfume 10 veces.",
      },
    },
  },

  share: {
    sheetTitleFragrance: "Compartir este perfume",
    sheetTitleToday: "Compartir el perfume de hoy",
    sheetTitlePicker: "Compartir el resultado",
    sheetTitleRecap: "Compartir tu resumen",
    previewLabel: "Vista previa",
    action: "Compartir",
    includeTimesWorn: "Incluir veces usado",
    includeRating: "Incluir mi calificación",
    fragranceMessage: "Estoy usando {{name}} 🌸",
    todayMessage: "Hoy estoy usando {{name}} 🌸",
    todayEmptyTitle: "Aún no registraste un uso hoy",
    todayEmptyMessage: "Registra un uso y vuelve para compartirlo.",
    pickerMessage: "¡El selector eligió {{name}} para mí! 🎰",
    recapIntro: "Mi resumen de Fragrance Collection 🌸",
    wearsFragment_one: "{{count}} uso registrado este mes",
    wearsFragment_other: "{{count}} usos registrados este mes",
    streakFragment: "racha de {{count}} días",
    collectionFragment_one: "{{count}} perfume en mi colección",
    collectionFragment_other: "{{count}} perfumes en mi colección",
    timesWornFragment_one: "usado {{count}} vez",
    timesWornFragment_other: "usado {{count}} veces",
    ratingFragment: "calificado {{stars}}/5",
    appSignature: "— registrado con Fragrance Collection",
    failedMessage: "No se pudo compartir — algo salió mal.",
  },
}

export default es
