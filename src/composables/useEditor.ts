import { createClient } from '@supabase/supabase-js'
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
  const { addFile, getFileByHash } = useFiles()
  const { addFileRef, getFileRefByHashAndRefid } = useFileRefs()

  const editor = ref<Editor | null>(null)

  /**
   * 从supabase中加载文件
   * 1. 通过hash查询indexedDB中的文件获取属性path
   * 2. 根据当前路由判断是否需要使用签名URL
   * 3. 返回文件的blob URL或签名URL
   */
  async function loadFileFromSupabase(hash: string) {
    try {
      // 检查当前路由是否为其他用户的备忘录
      // 路由格式: /:userId/n/:noteId
      const currentPath = window.location.pathname
      const isUserContext = /^\/[^/]+\/n\/[^/]+$/.test(currentPath)

      if (isUserContext) {
        // 访问其他用户的备忘录，使用签名URL
        const pathParts = currentPath.split('/')
        const noteUuid = pathParts[pathParts.length - 1]

        const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
        const { data: response, error: _error } = await supabase.functions.invoke('get-sign-file', {
          body: { note_uuid: noteUuid, hash },
        })

        return {
          url: response.signedUrl,
          type: response.type,
        }
      }
      else {
        // 访问自己的备忘录，直接下载文件

        // 1. 从 indexedDB 获取文件信息
        const fileData = await getFileByHash(hash)

        if (!fileData?.path) {
          console.warn(`文件未找到: ${hash}`)
          return { url: hash, type: '' }
        }
        const { downloadFileFromSupabase } = await import('@/extensions/supabase/utils/fileDownload')
        const result = await downloadFileFromSupabase(fileData.path)

        return {
          url: result.url,
          type: result.type || fileData.file?.type || '',
        }
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
          async loadFile(hash: string) {
            return await loadFileFromSupabase(hash)
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
  async function insertFiles(files: FileList) {
    if (!editor.value)
      return

    for (const file of Array.from(files)) {
      const hash = await getFileHash(file)
      const existFile = await getFileByHash(hash)
      const existFileRef = await getFileRefByHashAndRefid(hash, uuid)

      if (existFile) {
        editor.value.commands.setFileUpload({ url: existFile?.path || hash })
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
