import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FileUploadComponent from './FileUploadComponent.vue'

export interface FileUploadOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileUpload: {
      setFileUpload: (attributes: { url: string; localId: string }) => ReturnType
    }
  }
}

export const FileUpload = Node.create({
  name: 'fileUpload',

  group: 'inline',  // 将 block 改为 inline
  inline: true,     // 添加 inline: true 属性

  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
      },
      localId: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'file-upload',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['file-upload', mergeAttributes(HTMLAttributes)]
  },

  addCommands() {
    return {
      setFileUpload:
        attributes => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(FileUploadComponent)
  },
})
