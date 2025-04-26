import { defineConfig, transformerDirectives } from 'unocss'

export default defineConfig({
  transformers: [
    transformerDirectives(),
  ],
  shortcuts: [
    ['text-elipsis', 'overflow-hidden text-ellipsis whitespace-nowrap'],
  ],
})
