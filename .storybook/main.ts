import { fileURLToPath } from "node:url"
import type { StorybookConfig } from "@storybook/react-native-web-vite"
import type { Plugin } from "vite"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"

// expo-modules-core/src/ts-declarations/* are ambient type declarations whose
// runtime symbols come from the native JSI runtime. index.ts pulls them in via
// a side-effect import; Metro's babel strips them to nothing, but Vite keeps
// the import and then fails because the module exports no such value
// ("EventEmitter"/"SharedRef" is not exported). Resolving them to an empty
// module reproduces what the app's own build already does. Without this,
// anything importing @expo/vector-icons — most of the UI — fails to load.
const stubExpoAmbientDeclarations: Plugin = {
  name: "stub-expo-ambient-declarations",
  enforce: "pre",
  resolveId(source, importer) {
    // The import is relative from inside the package, so the package name only
    // appears on the importer's path.
    const isDeclarationPath = /(^|[\\/.])ts-declarations[\\/]/.test(source)
    const fromExpoCore = !!importer && importer.includes("expo-modules-core")
    if (isDeclarationPath && (fromExpoCore || source.includes("expo-modules-core"))) {
      return "\0expo-ambient-declaration"
    }
    return null
  },
  load(id) {
    return id === "\0expo-ambient-declaration" ? "export {}" : null
  },
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [],

  framework: {
    name: "@storybook/react-native-web-vite",
    options: {
      // Storybook drives Vite, not Metro, so NativeWind's Metro transformer
      // never runs — this reapplies the two pieces of babel.config.js that
      // make `className` work. babel-preset-expo is deliberately NOT reused
      // here: it applies Metro's CommonJS module transform, which breaks
      // ESM-only deps under Vite (tailwindcss/colors fails to interop).
      pluginReactOptions: {
        jsxImportSource: "nativewind",
        babel: { presets: ["nativewind/babel"] },
      },

      // Expo packages resolve to raw TypeScript (expo-modules-core's "exports"
      // points at ./src/index.ts) because Metro transpiles them itself. Vite
      // needs them named here to do the same. @expo/vector-icons reaches
      // expo-modules-core through expo-font, so most of the UI depends on it.
      modulesToTranspile: ["expo-modules-core"],
    },
  },

  // Tailwind is wired inline rather than via a root postcss.config.js on
  // purpose: Expo's Metro CSS pipeline also reads that file, and NativeWind
  // already processes global.css there. Keeping it here leaves the app build
  // untouched.
  viteFinal: async (cfg) => {
    cfg.plugins = [stubExpoAmbientDeclarations, ...(cfg.plugins ?? [])]
    cfg.css = { ...cfg.css, postcss: { plugins: [tailwindcss, autoprefixer] } }

    // expo-image and expo-haptics are native modules with nothing meaningful
    // to show in a browser, and pulling them in drags a chain of CommonJS
    // react-native-web internals that Vite can't convert. Stubs keep the
    // component source untouched.
    cfg.resolve = {
      ...cfg.resolve,
      alias: {
        ...cfg.resolve?.alias,
        "expo-image": fileURLToPath(new URL("./mocks/expo-image.tsx", import.meta.url)),
        "expo-haptics": fileURLToPath(new URL("./mocks/expo-haptics.ts", import.meta.url)),
      },
    }

    // Pre-bundling can't parse expo-modules-core's TypeScript sources — it
    // fails on the type-only imports the transform pipeline elides fine.
    cfg.optimizeDeps = {
      ...cfg.optimizeDeps,
      exclude: [...(cfg.optimizeDeps?.exclude ?? []), "expo-modules-core"],
      // Excluding it also skips its CommonJS dependencies, which then reach
      // the browser unconverted ("does not provide an export named 'default'").
      include: [...(cfg.optimizeDeps?.include ?? []), "invariant"],
    }
    return cfg
  },
}

export default config
