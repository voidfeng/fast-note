import { Color } from '@tiptap/extension-color'
import { ListItem, TaskItem, TaskList } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import { computed, onBeforeUnmount, ref } from 'vue'
import { FileUpload } from '@/components/extensions/FileUpload/FileUpload'
import { filesApi } from '@/extensions/pocketbase/api/client'
import { useNoteFiles } from '@/hooks/useNoteFiles'
import { getFileHash } from '@/utils'

/**
 * 编辑器组合式函数
 * 分离编辑器逻辑，提高可复用性和可测试性
 */
export function useEditor() {
  const editor = ref<Editor | null>(null)
  const { addNoteFile, getNoteFileByHash } = useNoteFiles()

  /**
   * 加载文件（优先从本地 indexedDB，然后从 PocketBase）
   */
  async function loadFileFromStorage(hash: string) {
    try {
      // 首先尝试从 indexedDB 获取本地文件
      const localFile = await getNoteFileByHash(hash)
      if (localFile && localFile.file) {
        // 创建临时URL用于显示
        const blobUrl = URL.createObjectURL(localFile.file)
        return {
          url: blobUrl,
          type: localFile.file.type,
        }
      }

      // 如果本地没有，则从 PocketBase 获取
      // 检查当前路由是否为其他用户的备忘录
      const currentPath = window.location.pathname
      const isUserContext = /^\/[^/]+\/n\/[^/]+$/.test(currentPath)

      if (isUserContext) {
        // 访问其他用户的备忘录，使用签名URL
        const pathParts = currentPath.split('/')
        const noteUuid = pathParts[pathParts.length - 1]

        const response = await filesApi.getSignedFileUrl(noteUuid, hash)

        if (response) {
          return {
            url: response.signedUrl,
            type: response.type,
          }
        }

        console.warn(`无法获取文件签名URL: ${hash}`)
        return { url: hash, type: '' }
      }
      else {
        // 访问自己的备忘录，从 PocketBase 获取文件
        const result = await filesApi.getFileByHash(hash)
        if (result) {
          return {
            url: result.url,
            type: result.type,
          }
        }

        console.warn(`文件未找到: ${hash}`)
        return { url: hash, type: '' }
      }
    }
    catch (error) {
      console.error('加载文件失败:', error)
      return {
        url: hash,
        type: '',
      }
    }
  }

  /**
   * 初始化编辑器
   */
  function initEditor(options: {
    onFocus?: () => void
    onBlur?: () => void
  } = {}) {
    editor.value = new Editor({
      extensions: [
        Color.configure({ types: [TextStyleKit.name, ListItem.name] }),
        TextStyleKit,
        StarterKit,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        TaskList,
        TaskItem,
        TableKit,
        FileUpload.configure({
          async loadFile(hash: string): Promise<{ url: string, type: string }> {
            const result = await loadFileFromStorage(hash)
            if (result && result.url && result.type) {
              return { url: result.url, type: result.type }
            }
            return { url: '', type: '' }
          },
          onImageLoaded(url: string, width: number, height: number) {
            console.warn('图片加载完成', url, width, height)
          },
        }),
        GlobalDragHandle.configure({
          dragHandleWidth: 20,
          scrollTreshold: 100,
          dragHandleSelector: '.custom-drag-handle',
          excludedTags: [],
          customNodes: [],
        }),
      ],
      content: '',
      onBlur: options.onBlur,
      onFocus: options.onFocus,
    })
  }

  /**
   * 插入文件到编辑器
   */
  async function insertFiles(files: FileList): Promise<string[]> {
    if (!editor.value)
      return []

    const insertedHashes: string[] = []

    for (const file of Array.from(files)) {
      try {
        // 计算文件hash
        const hash = await getFileHash(file)

        // 检查文件是否已存在，如果不存在则存储
        const existingFile = await getNoteFileByHash(hash)
        if (!existingFile) {
          await addNoteFile(file, hash)
        }

        // 在编辑器中插入文件，使用hash作为url
        editor.value.commands.setFileUpload({ url: hash })
        insertedHashes.push(hash)
      }
      catch (error) {
        console.error('插入文件失败:', error, file.name)
      }
    }

    return insertedHashes
  }

  /**
   * 从编辑器内容中提取文件hash
   */
  function extractFileHashes(): string[] {
    if (!editor.value) {
      return []
    }

    const html = editor.value.getHTML()
    // 提取 file-upload 元素的 url 属性（即hash值）
    const fileHashRegex = /<file-upload[^>]+url="([^"]+)"/g
    const fileHashes: string[] = []
    let match = fileHashRegex.exec(html)

    while (match !== null) {
      fileHashes.push(match[1])
      match = fileHashRegex.exec(html)
    }

    return fileHashes
  }

  /**
   * 获取编辑器内容标题和摘要
   */
  function getContentInfo() {
    if (!editor.value)
      return { title: '', summary: '' }

    function extractTextFromNode(node: any): string {
      if (!node)
        return ''

      if (node.type === 'text') {
        return node.text || ''
      }

      if (['heading', 'listItem', 'paragraph'].includes(node.type)) {
        let text = ''
        if (node.content && Array.isArray(node.content)) {
          node.content.forEach((child: any) => {
            if (child.type === 'text') {
              text += child.text || ''
            }
          })
        }
        return text
      }

      return `[${node.type}]`
    }

    const json = editor.value.getJSON()
    let title = ''

    if (json?.content && json.content.length > 0 && json.content[0]) {
      title = extractTextFromNode(json.content[0]).trim()
    }

    const summary = editor.value
      .getText()
      .replace(title, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 255)

    return { title, summary }
  }

  /**
   * 设置编辑器内容
   */
  function setContent(content: string) {
    editor.value?.commands.setContent(content)
  }

  /**
   * 获取编辑器内容
   */
  function getContent(): string | undefined {
    return editor.value?.getHTML()
  }

  /**
   * 设置编辑器可编辑状态
   */
  function setEditable(editable: boolean) {
    editor.value?.setEditable(editable)
  }

  /**
   * 设置输入模式
   */
  function setInputMode(inputMode: 'text' | 'none') {
    editor.value?.setOptions({
      editorProps: {
        attributes: {
          inputmode: inputMode,
        },
      },
    })
  }

  /**
   * 销毁编辑器
   */
  function destroyEditor() {
    editor.value?.destroy()
    editor.value = null
  }

  // 组件卸载时自动销毁编辑器
  onBeforeUnmount(() => {
    destroyEditor()
  })

  return {
    editor: computed(() => editor.value),
    initEditor,
    insertFiles,
    extractFileHashes,
    getContentInfo,
    setContent,
    getContent,
    setEditable,
    setInputMode,
    destroyEditor,
  }
}
