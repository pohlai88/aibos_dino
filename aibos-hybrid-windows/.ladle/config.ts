import type { Config } from '@ladle/react'

const config: Config = {
  stories: ['../src/**/*.stories.tsx'],
  addons: [
    '@ladle/react/controls',
    '@ladle/react/actions',
    '@ladle/react/backgrounds',
    '@ladle/react/viewport',
  ],
  core: {
    builder: '@ladle/react/vite',
  },
  framework: {
    name: '@ladle/react',
    options: {},
  },
  features: {
    storyStoreV7: true,
    interactionsDebugger: true,
  },
  docs: {
    autodocs: true,
  },
  viteFinal: async (config) => {
    // Add any Vite configuration here
    return config
  },
}

export default config 