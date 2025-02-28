import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

import uploadFile from './uploadFile.vue'

export default Node.create({
  name: 'uploadFile',
  group: 'block',
  content: 'block+',
  draggable: true,
  editable: false,

  addAttributes() {
    return {
      url: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="upload-file"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'upload-file',
        draggable: 'true',
      }),
      0,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(uploadFile)
  },
})
