import type { Dictionary } from "../types"

const en: Dictionary = {
  common: {
    cancel: "Cancel",
    close: "Close",
    share: "Share",
    done: "Done",
    ok: "OK",
    loading: "Loading…",
  },

  screens: {
    wearHistory: "Scent Diary",
    privacyPolicy: "Privacy Policy",
    terms: "Terms & Conditions",
    badges: "Badge Wall",
  },

  profile: {
    title: "Profile",
    anonymous: "Anonymous",
    memberSince: "Member since {{date}}",
    stats: {
      inCollection: "In collection",
      totalWears: "Times worn",
      thisMonth: "This month",
      dayStreak_one: "Day streak",
      dayStreak_other: "Day streak",
    },
    mostWornLabel: "Most worn:",
    mostWornCount: "({{count}}x)",
    upgradeToPro: "Upgrade to Pro",
    viewPaywallDev: "View paywall (dev)",
    toastWelcomePro: "Welcome to Pro!",
    toastPurchasesRestored: "Purchases restored",
    wearHistoryRow: "Scent diary",
    moderationQueue: "Moderation queue",
    sectionActivity: "Activity",
    sectionPreferences: "Preferences",
    sectionAccount: "Account",
    freeCollectionLimit: "{{count}}/{{limit}} in your free collection",
    gettingStartedGuide: "Getting started guide",
    exportData: "Export your data",
    appearance: "Appearance",
    appearanceSystem: "Match system",
    appearanceLight: "Light",
    appearanceDark: "Dark",
    dailyReminder: "Daily reminder",
    reminderUpdateFailedTitle: "Oops",
    reminderUpdateFailedMessage: "Couldn't update your reminder setting, please try again.",
    language: "Language",
    shareRecap: "Share my recap",
    shareToday: "Share today's scent",
    signOut: "Sign out",
    deleteAccount: "Delete account",
    deletingAccount: "Deleting account…",
    deleteConfirmTitle: "Delete account?",
    deleteConfirmMessage:
      "This permanently deletes your account, collection, and scent diary. This cannot be undone.",
    deleteConfirmConfirm: "Delete",
    deleteFailedTitle: "Deletion failed",
    deleteFailedMessage: "Something went wrong, please try again later.",
  },

  language: {
    title: "Language",
    system: "System default",
    english: "English",
    spanish: "Español",
  },

  gamification: {
    header: {
      levelLabel: "Level {{level}}",
      xpToNext: "{{current}}/{{target}} XP to next level",
      maxLevelXp: "{{xp}} XP total · Max level",
      streakLabel_one: "{{count}}-day streak",
      streakLabel_other: "{{count}}-day streak",
      badgesEarned: "{{count}}/{{total}} badges",
    },

    levels: {
      "1": "Rookie Sniffer",
      "2": "Scent Scout",
      "3": "Fragrance Apprentice",
      "4": "Perfume Enthusiast",
      "5": "Top-Note Tactician",
      "6": "Sillage Connoisseur",
      "7": "Master Blender",
      "8": "Olfactory Sage",
      "9": "Scent Virtuoso",
      "10": "The Nose",
    },

    badgeWall: {
      title: "Badge Wall",
      sectionStreak: "Streaks",
      sectionWears: "Wears",
      sectionCollection: "Collection",
      sectionExplorer: "Explorer",
      sectionSpecial: "Special",
      lockedProgress: "{{current}}/{{target}}",
      seeAllRow: "See all badges",
      recentlyEarned: "Recently earned",
      almostThere: "Almost there",
      emptyTitle: "No badges yet",
      emptyMessage: "Log a wear to start earning badges.",
    },

    toasts: {
      levelUp: "Level up! You're now {{title}} 🎉",
      badgeUnlocked: "Badge unlocked: {{name}} 🏅",
    },

    badges: {
      "streak-3": {
        name: "Warming Up",
        description: "Wear something 3 days in a row.",
      },
      "streak-7": {
        name: "Week of Whiffs",
        description: "Hit a 7-day wearing streak.",
      },
      "streak-30": {
        name: "Scent Habit",
        description: "Keep a streak going for 30 days.",
      },
      "streak-100": {
        name: "Centurion Nose",
        description: "Reach a 100-day streak. Certified addiction.",
      },
      "wears-1": {
        name: "First Whiff",
        description: "Log your very first wear.",
      },
      "wears-25": {
        name: "Getting Into It",
        description: "Log 25 wears.",
      },
      "wears-100": {
        name: "Triple Digits",
        description: "Log 100 wears.",
      },
      "wears-500": {
        name: "Wear Machine",
        description: "Log 500 wears. Are you okay?",
      },
      "collection-5": {
        name: "Starter Shelf",
        description: "Add 5 fragrances to your collection.",
      },
      "collection-15": {
        name: "Building a Wardrobe",
        description: "Grow your collection to 15 fragrances.",
      },
      "collection-40": {
        name: "Fragrance Hoarder",
        description: "Grow your collection to 40 fragrances.",
      },
      "explorer-3": {
        name: "Brand Curious",
        description: "Wear fragrances from 3 different brands.",
      },
      "explorer-8": {
        name: "Well-Traveled Nose",
        description: "Wear fragrances from 8 different brands.",
      },
      "explorer-15": {
        name: "Perfume Passport",
        description: "Wear fragrances from 15 different brands.",
      },
      "special-dusted-off": {
        name: "Dusted Off",
        description: "Re-wear a fragrance after 30+ days in the drawer.",
      },
      "special-loyalist": {
        name: "Loyalist",
        description: "Wear the same fragrance 10 times.",
      },
    },
  },

  share: {
    sheetTitleFragrance: "Share this fragrance",
    sheetTitleToday: "Share today's scent",
    sheetTitlePicker: "Share the pick",
    sheetTitleRecap: "Share your recap",
    previewLabel: "Preview",
    action: "Share",
    includeTimesWorn: "Include times worn",
    includeRating: "Include my rating",
    fragranceMessage: "I'm wearing {{name}} 🌸",
    todayMessage: "Today I'm wearing {{name}} 🌸",
    todayEmptyTitle: "Nothing worn yet today",
    todayEmptyMessage: "Wear something today, then come back to share it.",
    pickerMessage: "The picker just chose {{name}} for me! 🎰",
    recapIntro: "My Fragrance Collection recap 🌸",
    wearsFragment_one: "Worn once this month",
    wearsFragment_other: "Worn {{count}} times this month",
    streakFragment: "{{count}}-day streak",
    collectionFragment_one: "{{count}} fragrance in my collection",
    collectionFragment_other: "{{count}} fragrances in my collection",
    timesWornFragment_one: "worn {{count}} time",
    timesWornFragment_other: "worn {{count}} times",
    ratingFragment: "rated {{stars}}/5",
    appSignature: "— tracked with Fragrance Collection",
    failedMessage: "Couldn't share — something went wrong.",
  },
}

export default en
