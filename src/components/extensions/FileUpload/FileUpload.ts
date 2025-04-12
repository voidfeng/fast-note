import type { NodeViewRendererProps } from '@tiptap/vue-3'
import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FileUploadComponent from './FileUploadComponent.vue'

export interface FileUploadOptions {
  HTMLAttributes: Record<string, any>
  loadImage?: (url: string) => Promise<{
    url: string
    isLoading: boolean
    error: Error | null
  }>
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
        return {
          url,
          isLoading: false,
          error: null,
        }
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
