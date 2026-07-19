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
    userProfile: "Coleccionista",
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
    publicProfile: "Perfil público",
    publicUpdateFailedTitle: "Ups",
    publicUpdateFailedMessage: "No se pudo actualizar tu perfil público, inténtalo de nuevo.",
    headerPhoto: {
      title: "Foto de colección",
      take: "Tomar foto",
      choose: "Elegir de la galería",
      remove: "Quitar foto",
      saved: "Foto de colección actualizada",
      removed: "Foto de colección eliminada",
      failed: "No se pudo actualizar la foto, inténtalo de nuevo.",
      rejected: "Esa foto no se puede usar; elige una foto de tu colección.",
      permissionTitle: "Se necesita permiso",
      permissionMessage:
        "Permite el acceso a la cámara o a las fotos para Whiff en los ajustes del dispositivo para añadir una foto de colección.",
    },
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

  collectors: {
    meta: "Nivel {{level}} · {{count}} usos",
    emptyTitle: "Aún no hay coleccionistas públicos",
    emptyMessage: "Haz público tu perfil para ser el primero en aparecer aquí.",
    errorTitle: "No se pudieron cargar los coleccionistas",
    errorMessage: "Revisa tu conexión e inténtalo de nuevo.",
    errorAction: "Reintentar",
  },

  userProfile: {
    privateTitle: "Este perfil es privado",
    privateMessage: "Este coleccionista no ha hecho público su perfil.",
    badgesTitle: "Insignias",
    topWornTitle: "Más usados",
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

    quests: {
      cardTitle: "Misiones semanales",
      doneCount: "{{done}}/{{total}} completadas",
      toastComplete: "Misión completa: {{title}} +{{xp}} XP 🎉",
      "days-3": {
        title: "Triplete",
        description: "Usa un perfume en 3 días diferentes esta semana.",
      },
      "days-5": {
        title: "Casi Todos los Días",
        description: "Usa un perfume en 5 días diferentes esta semana.",
      },
      "scents-3": {
        title: "Mézclalo",
        description: "Usa 3 perfumes diferentes esta semana.",
      },
      "brands-2": {
        title: "Saltamarcas",
        description: "Usa perfumes de 2 marcas diferentes esta semana.",
      },
      "wears-7": {
        title: "Siete Rociadas",
        description: "Registra 7 usos esta semana.",
      },
      "dust-off": {
        title: "Desempolvado",
        description: "Vuelve a usar algo que no tocas hace 30+ días.",
      },
      "favorite-4": {
        title: "Favorito de la Casa",
        description: "Usa algo que calificaste con 4 estrellas o más.",
      },
      "first-wear": {
        title: "Debut Aromático",
        description: "Usa un perfume por primera vez.",
      },
    },
  },

  streakSaver: {
    usedToast: "🔥 ¡Streak Saver usado — tu racha de {{count}} días sigue viva!",
    upsellTitle: "Tu racha se acaba de romper",
    upsellMessage:
      "Tu racha de {{count}} días se acaba de romper — Streak Saver (Pro) rellena automáticamente un día perdido para que rachas así sobrevivan.",
    remainingThisMonth: "{{count}}/{{limit}} rachas salvadas restantes este mes",
  },

  share: {
    sheetTitleFragrance: "Compartir este perfume",
    sheetTitleToday: "Compartir el perfume de hoy",
    sheetTitlePicker: "Compartir el resultado",
    sheetTitleRecap: "Compartir tu resumen",
    sheetTitleMonthlyRecap: "Compartir tu resumen de Whiffs",
    previewLabel: "Vista previa",
    action: "Compartir",
    includeTimesWorn: "Incluir veces usado",
    includeRating: "Incluir mi calificación",
    fragranceMessage: "Estoy usando {{name}} 🌸",
    todayMessage: "Hoy estoy usando {{name}} 🌸",
    todayEmptyTitle: "Aún no registraste un uso hoy",
    todayEmptyMessage: "Registra un uso y vuelve para compartirlo.",
    pickerMessage: "¡El selector eligió {{name}} para mí! 🎰",
    recapIntro: "Mi resumen de Whiff 🌸",
    wearsFragment_one: "{{count}} uso registrado este mes",
    wearsFragment_other: "{{count}} usos registrados este mes",
    streakFragment: "racha de {{count}} días",
    collectionFragment_one: "{{count}} perfume en mi colección",
    collectionFragment_other: "{{count}} perfumes en mi colección",
    timesWornFragment_one: "usado {{count}} vez",
    timesWornFragment_other: "usado {{count}} veces",
    ratingFragment: "calificado {{stars}}/5",
    appSignature: "— registrado con Whiff",
    failedMessage: "No se pudo compartir — algo salió mal.",
  },

  recap: {
    entryRow: "Tu mes en Whiffs",
    eyebrow: "Tu mes en Whiffs",
    heroTitle: "Tu {{month}} en Whiffs",
    heroSubtitle: "Esto fue lo que hizo tu nariz.",
    totalWearsLabel: "Usos registrados",
    distinctLabel: "Perfumes usados",
    topThreeTitle: "Tu top 3",
    bestStreakLabel_one: "Mejor racha: {{count}} día",
    bestStreakLabel_other: "Mejor racha: {{count}} días",
    newBadgesTitle: "Insignias nuevas este mes",
    noNewBadges: "Sin insignias nuevas este mes — no rompas la racha.",
    levelSectionTitle: "Dónde quedaste",
    levelLabel: "Nivel",
    xpGainedLabel: "XP ganado",
    emptyTitle: "Nada registrado en {{month}}",
    emptyMessage: "Aún no hay usos ese mes — registra uno para llenar el próximo resumen.",
    promptToast: "Tu resumen de {{month}} ya está listo",
    promptAction: "Ver",
    shareIntro: "Mi {{month}} en Whiffs 🌸",
    shareWearsFragment_one: "{{count}} uso registrado",
    shareWearsFragment_other: "{{count}} usos registrados",
    shareTopFragment: "Más usado: {{name}}",
    shareStreakFragment: "racha de {{count}} días",
    shareBadgesFragment_one: "{{count}} insignia nueva ganada",
    shareBadgesFragment_other: "{{count}} insignias nuevas ganadas",
    shareLevelFragment: "Terminaste el mes como {{title}}",
  },
}

export default es
