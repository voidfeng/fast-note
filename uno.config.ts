import { defineConfig, transformerDirectives } from 'unocss'

const theme = {
  light: {},
  dark: {
    gray: {
      700: '#3a3a3c',
      750: '#3c3b41',
      900: '#1c1c1e',
    },
    primary: '#dab13d',
  },
}

export default defineConfig({
  transformers: [
    transformerDirectives(),
  ],
  shortcuts: [
    ['text-elipsis', 'overflow-hidden text-ellipsis whitespace-nowrap'],
  ],
  theme: {
    colors: {
      gray: {
        '700': theme.dark.gray[700],
        '750': theme.dark.gray[750],
        '900': theme.dark.gray[900],

        'dark-700': theme.dark.gray[700],
        'dark-750': theme.dark.gray[750],
        'dark-900': theme.dark.gray[900],
      },
      primary: theme.dark.primary,
    },
  },
})
