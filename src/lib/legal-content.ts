// In-app copies of the legal documents. The canonical hosted versions live in
// docs/privacy-policy.md and docs/terms-and-conditions.md — keep the two in
// sync when either changes.

export interface LegalSection {
  heading?: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface LegalDoc {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  lastUpdated: "July 18, 2026",
  sections: [
    {
      paragraphs: [
        "Fragrance Collection (“the app”) is a personal fragrance collection tracker. This policy explains what data the app collects, how it is used, and the choices you have.",
      ],
    },
    {
      heading: "What we collect",
      paragraphs: [
        "Account information. When you sign in with Google or Apple, we receive your name, email address, and profile picture from the identity provider. We use this only to create and identify your account. We never see your Google or Apple password.",
        "Collection and usage data. The fragrances you add, personal ratings and notes you write, your private fragrance votes, and a log of the days you wear each fragrance (“wear events”). This is the app's core functionality.",
        "Push notification token. If you grant notification permission, a device push token is stored so the app can send you the daily wear reminder. You can turn reminders off at any time in your profile.",
        "Advertising. The free tier shows ads served by Google AdMob after you use the picker. AdMob may use your device's advertising identifier to serve and measure ads — see Google's privacy policy (policies.google.com) for details. Upgrading to Pro removes ads.",
        "We do not collect your location, contacts, or photos, and we run no analytics beyond crash reports.",
      ],
    },
    {
      heading: "How your data is used",
      bullets: [
        "Your collection, personal notes, individual ratings, and individual fragrance votes are private to your account and protected by row-level security — no other user can read those individual rows. Anonymous aggregate ratings and voting distributions, plus aggregated wear counts, power community features.",
        "Wear events feed the community Most Worn leaderboard. Only anonymous, aggregated counts per fragrance are ever shown to other users; your identity is never attached to a leaderboard entry.",
        "We do not sell your data or use it for any purpose other than operating the app. Your collection and account data are never shared with advertisers — ads are served by Google AdMob independently of your app data.",
      ],
    },
    {
      heading: "Where your data lives",
      paragraphs: [
        "Data is stored with Supabase (Postgres database and authentication), hosted in the EU (eu-west-1). Push notifications are delivered through Expo's push service and Apple/Google's notification services. Crash reports, if enabled, are processed by Sentry.",
      ],
    },
    {
      heading: "Data retention and deletion",
      paragraphs: [
        "Your data is kept for as long as your account exists. You can delete your account at any time from Profile → Delete account — this permanently removes your account, collection, notes, individual ratings and votes, scent diary, and push tokens. Deletion is immediate and cannot be undone.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "The app is not directed at children under 13 and we do not knowingly collect data from them.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "If this policy changes materially, the updated version will be posted here with a new “Last updated” date.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: ["Questions or data requests: korchev94@gmail.com"],
    },
  ],
}

export const TERMS_AND_CONDITIONS: LegalDoc = {
  title: "Terms & Conditions",
  lastUpdated: "July 18, 2026",
  sections: [
    {
      paragraphs: [
        "By creating an account or using Fragrance Collection (“the app”), you agree to these terms. If you do not agree, do not use the app.",
      ],
    },
    {
      heading: "The service",
      paragraphs: [
        "The app lets you track a personal fragrance collection, log the days you wear each fragrance, and browse community features such as the Most Worn leaderboard, which shows anonymous, aggregated wear counts and anonymous aggregate fragrance ratings and voting distributions. The app is provided free of charge.",
      ],
    },
    {
      heading: "Your account",
      paragraphs: [
        "You sign in with a Google or Apple account and are responsible for keeping access to that account and your device secure. You must be at least 13 years old to use the app. You can delete your account at any time from Profile → Delete account.",
      ],
    },
    {
      heading: "Your content",
      paragraphs: [
        "You keep ownership of the content you add to the app — ratings, notes, fragrance votes, and fragrances you enter manually. You grant us the limited license needed to store that content and operate the app's features, including showing anonymous, aggregated wear counts, ratings, and fragrance-voting distributions (and the fragrance names and images they refer to) in community features.",
        "Because the name and image of a fragrance you add manually can appear in community features once you log wears for it, you agree not to enter content that is unlawful, offensive, or infringes someone else's rights. We may remove such content.",
      ],
    },
    {
      heading: "Acceptable use",
      bullets: [
        "Don't interfere with or disrupt the app or the servers behind it.",
        "Don't attempt to access other users' data.",
        "Don't scrape, bulk-download, or access the service with automated tools.",
        "Don't reverse engineer or misuse the app or its APIs.",
      ],
    },
    {
      heading: "Catalog data",
      paragraphs: [
        "The fragrance catalog is provided for convenience and may be incomplete or inaccurate. Fragrance names, brands, and product images remain the property of their respective owners; their inclusion does not imply any affiliation or endorsement.",
      ],
    },
    {
      heading: "Termination",
      paragraphs: [
        "We may suspend or terminate accounts that violate these terms or harm the service or other users. You can stop using the app and delete your account at any time; deletion removes your data as described in the Privacy Policy.",
      ],
    },
    {
      heading: "Disclaimer",
      paragraphs: [
        "The app is provided “as is” and “as available”, without warranties of any kind, express or implied. We do not guarantee that the app will be uninterrupted, error-free, or that data will never be lost — keep your own records of anything irreplaceable.",
      ],
    },
    {
      heading: "Limitation of liability",
      paragraphs: [
        "To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages, or any loss of data or goodwill, arising from your use of the app.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "We may update these terms from time to time. Material changes will be posted here with a new “Last updated” date; continuing to use the app after a change means you accept the updated terms.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: ["Questions about these terms: korchev94@gmail.com"],
    },
  ],
}
