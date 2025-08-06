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
import { useFileRefs } from '@/hooks/useFileRefs'
import { useFiles } from '@/hooks/useFiles'
import { getFileHash } from '@/utils'
import { getTime } from '@/utils/date'

/**
 * 编辑器组合式函数
 * 分离编辑器逻辑，提高可复用性和可测试性
 */
export function useEditor(uuid: string) {
  const { addFile, getFileByHash, getFileByUrl } = useFiles()
  const { addFileRef, getFileRefByHashAndRefid } = useFileRefs()

  const editor = ref<Editor | null>(null)

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
          async loadFile(url: string) {
            return await loadFileFromStorage(url)
          },
          onImageLoaded(url: string, width: number, height: number) {
            console.log('图片加载完成', url, width, height)
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
   * 从存储中加载文件
   */
  async function loadFileFromStorage(url: string) {
    let fileObj

    // 判断是否为SHA256哈希
    if (/^[a-f0-9]{64}$/i.test(url)) {
      fileObj = await getFileByHash(url)
    }
    else {
      fileObj = await getFileByUrl(url)
    }

    if (!fileObj) {
      console.warn('文件不存在:', url)
      throw new Error('文件不存在')
    }

    if (fileObj.file) {
      const fileType = fileObj.file.type || 'unknown'
      const fileUrl = URL.createObjectURL(fileObj.file)
      return { url: fileUrl, type: fileType }
    }
    else if (fileObj.url) {
      return { url: fileObj.url, type: 'unknown' }
    }

    throw new Error('文件格式不支持')
  }

  /**
   * 插入文件到编辑器
   */
  async function insertFiles(files: FileList) {
    if (!editor.value)
      return

    for (const file of Array.from(files)) {
      const hash = await getFileHash(file)
      const existFile = await getFileByHash(hash)
      const existFileRef = await getFileRefByHashAndRefid(hash, uuid)

      if (existFile) {
        editor.value.commands.setFileUpload({ url: existFile?.url || hash })
      }
      else {
        await addFile({
          hash,
          file,
          id: 0,
          lastdotime: getTime(),
          isdeleted: 0,
        })
        editor.value.commands.setFileUpload({ url: hash })
      }

      if (!existFileRef) {
        await addFileRef({
          hash,
          refid: uuid,
          lastdotime: getTime(),
          isdeleted: 0,
        })
      }
    }
  }

  /**
   * 获取编辑器内容标题和摘要
   */
  function getContentInfo() {
    if (!editor.value)
      return { title: '', smalltext: '' }

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

    const smalltext = editor.value
      .getText()
      .replace(title, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 255)

    return { title, smalltext }
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
    getContentInfo,
    setContent,
    getContent,
    setEditable,
    setInputMode,
    destroyEditor,
  }
}
