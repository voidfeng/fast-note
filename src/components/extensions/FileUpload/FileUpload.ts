import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FileUploadComponent from './FileUploadComponent.vue'

export interface FileUploadOptions {
  HTMLAttributes: Record<string, any>
  loadImage?: (url: string) => Promise<string>
  onImageLoaded?: (url: string, width: number, height: number) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileUpload: {
      setFileUpload: (attributes: { url?: string, id?: number, type?: string }) => ReturnType
    }
  }
}

export const FileUpload = Node.create<FileUploadOptions>({
  name: 'fileUpload',

  group: 'inline',
  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      loadImage: async (url: string) => {
        return url
      },
      onImageLoaded: (_url: string, _width: number, _height: number) => {
        // 默认实现是空的，由YYEditor提供具体实现
      },
    }
  },

  addAttributes() {
    return {
      url: {
        default: null,
      },
      id: {
        default: null,
      },
      type: {
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
    return VueNodeViewRenderer(FileUploadComponent as any)
  },
})
