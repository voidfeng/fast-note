import { defineConfig, transformerDirectives } from 'unocss'

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
        700: '#3a3a3c',
        750: '#3c3b41',
        900: '#1c1c1e',
      },
      // primary: {
      // DEFAULT: '#dab13d',
      // light: '#f5e7b3',
      // dark: '#a88a1d',
      // },
    },
  },
})
