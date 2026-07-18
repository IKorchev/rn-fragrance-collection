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
