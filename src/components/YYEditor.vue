<script lang="ts" setup>
import { useFiles } from '@/hooks/useFiles'
import { getFileHash } from '@/utils'
import { Color } from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import ListItem from '@tiptap/extension-list-item'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent } from '@tiptap/vue-3'
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import { onBeforeMount, onMounted, ref } from 'vue'
import { FileUpload } from './extensions/FileUpload/FileUpload'

// 定义编辑器类型
type EditorInstance = Editor | null

const emit = defineEmits<{
  (e: 'blur'): void
}>()

const { addFile, getFileByHash } = useFiles()

const editor = ref<EditorInstance>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// 图片加载状态管理
const imageLoadingStates = new Map<string, { isLoading: boolean, error: Error | null, url: string | null }>()

// 用于给 FileUpload 扩展使用的函数
async function _loadImage(url: string) {
  if (!imageLoadingStates.has(url)) {
    imageLoadingStates.set(url, { isLoading: true, error: null, url: null })
  }

  const state = imageLoadingStates.get(url)!

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.status}`)
    }

    const blob = await response.blob()
    state.url = URL.createObjectURL(blob)
  }
  catch (err) {
    state.error = err as Error
    state.url = url // 如果获取失败，使用原始 URL
  }
  finally {
    state.isLoading = false
  }

  return state
}

function cleanupImage(url: string) {
  const state = imageLoadingStates.get(url)
  if (state?.url && state.url.startsWith('blob:')) {
    URL.revokeObjectURL(state.url)
  }
  imageLoadingStates.delete(url)
}

function getTitle(): string {
  const json = editor.value?.getJSON()
  if (!json || !json.content || json.content.length === 0) {
    return ''
  }

  // 递归遍历节点提取文本
  function extractTextFromNode(node: any): string {
    if (!node)
      return ''

    // 如果是文本节点，直接返回文本内容
    if (node.type === 'text') {
      return node.text || ''
    }

    // 如果是heading、listItem或paragraph，提取其内部文本并直接返回
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

    // 其他类型节点，返回节点类型
    return `[${node.type}]`
  }

  // 从第一个节点提取文本作为标题
  if (json.content.length > 0) {
    return extractTextFromNode(json.content[0]).trim()
  }

  return ''
}

onMounted(() => {
  editor.value = new Editor({
    extensions: [
      Color.configure({ types: [TextStyle.name, ListItem.name] }),
      TextStyle,
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem,
      FileUpload.configure({
        /**
         * 通过url从indexeddb获取文件并转为url地址
         * 如果没有获取到就直接抛出错误
         * @param url 文件url
         */
        async loadImage(url: string) {
          // return 'https://next.0122.vip/eadmin/admin/adminstyle/1/images/logo.gif'
          console.warn('通过从配置获取文件url', url)
          throw new Error('没有图片')
        },
      }),
      GlobalDragHandle.configure({
        dragHandleWidth: 20, // default

        // The scrollTreshold specifies how close the user must drag an element to the edge of the lower/upper screen for automatic
        // scrolling to take place. For example, scrollTreshold = 100 means that scrolling starts automatically when the user drags an
        // element to a position that is max. 99px away from the edge of the screen
        // You can set this to 0 to prevent auto scrolling caused by this extension
        scrollTreshold: 100, // default

        // The css selector to query for the drag handle. (eg: '.custom-handle').
        // If handle element is found, that element will be used as drag handle.
        // If not, a default handle will be created
        dragHandleSelector: '.custom-drag-handle', // default is undefined

        // Tags to be excluded for drag handle
        // If you want to hide the global drag handle for specific HTML tags, you can use this option.
        // For example, setting this option to ['p', 'hr'] will hide the global drag handle for <p> and <hr> tags.
        excludedTags: [], // default

        // Custom nodes to be included for drag handle
        // For example having a custom Alert component. Add data-type="alert" to the node component wrapper.
        // Then add it to this list as ['alert']
        //
        customNodes: [],
      }),
    ],
    content: '',
    onBlur: () => {
      emit('blur')
    },
  })
})

function setContent(content: string): void {
  editor.value?.commands.setContent(content)
}

function insertFile() {
  editor.value!.commands.setFileUpload({
    url: 'https://example.com/path/to/file.pdf',
    // localId: 'file-123',
  })
}

function insertImage() {
  editor.value!.commands.setFileUpload({
    url: 'https://placehold.co/400x200.png',
    // localId: `image-${Date.now()}`,
  })
}

/**
 * 1. 获取所选择文件，可能为多个
 * 2. 将文件转换为blob地址，并且正确匹配blob的文件类型
 * 3. 将blob地址使用setFileUpload插入到编辑器中
 */
async function onSelectFile() {
  const files = fileInput.value?.files
  if (!files)
    return

  for (const file of Array.from(files)) {
    const hash = await getFileHash(file)
    const exist = await getFileByHash(hash)
    if (exist) {
      editor.value!.commands.setFileUpload({
        id: exist?.id,
        url: exist?.url,
      })
      continue
    }
    const id = await addFile({ file, hash, ids: [] })
    editor.value!.commands.setFileUpload({
      id,
    })
  }
}

onBeforeMount(() => {
  // 清理所有图片的 blob URL
  imageLoadingStates.forEach((_, url) => cleanupImage(url))
  editor.value?.destroy()
})

defineExpose({
  getContent: (): string | undefined => editor.value?.getHTML(),
  getTitle,
  setContent,
})
</script>

<template>
  <div v-if="editor" class="yy-editor">
    <EditorContent :editor="editor as any" />
    <div class="button-group">
      <input ref="fileInput" type="file" @change="onSelectFile">
      <button @click="insertFile">
        插入文件
      </button>
      <button @click="insertImage">
        插入图片
      </button>
      <button
        :disabled="!editor.can().chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        加粗
      </button>
      <button
        :disabled="!editor.can().chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        斜体
      </button>
      <button
        :disabled="!editor.can().chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        删除线
      </button>
      <button
        :disabled="!editor.can().chain().focus().toggleCode().run()"
        :class="{ 'is-active': editor.isActive('code') }"
        @click="editor.chain().focus().toggleCode().run()"
      >
        代码
      </button>
      <button @click="editor.chain().focus().unsetAllMarks().run()">
        清除标记
      </button>
      <button @click="editor.chain().focus().clearNodes().run()">
        清除节点
      </button>
      <button
        :class="{ 'is-active': editor.isActive('paragraph') }"
        @click="editor.chain().focus().setParagraph().run()"
      >
        段落
      </button>
      <button @click="editor.chain().focus().unsetTextAlign().run()">
        左对齐
      </button>
      <button
        :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
        @click="editor.chain().focus().setTextAlign('center').run()"
      >
        居中
      </button>
      <button
        :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
        @click="editor.chain().focus().setTextAlign('right').run()"
      >
        右对齐
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        H1
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 4 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 4 }).run()"
      >
        H4
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 5 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 5 }).run()"
      >
        H5
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 6 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 6 }).run()"
      >
        H6
      </button>
      <button
        :class="{ 'is-active': editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        无序列表
      </button>
      <button
        :class="{ 'is-active': editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        有序列表
      </button>
      <button
        :class="{ 'is-active': editor.isActive('codeBlock') }"
        @click="editor.chain().focus().toggleCodeBlock().run()"
      >
        代码块
      </button>
      <button
        :class="{ 'is-active': editor.isActive('blockquote') }"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        引用
      </button>
      <button @click="editor.chain().focus().setHorizontalRule().run()">
        水平线
      </button>
      <button @click="editor.chain().focus().setHardBreak().run()">
        硬换行
      </button>
      <button
        :disabled="!editor.can().chain().focus().undo().run()"
        @click="editor.chain().focus().undo().run()"
      >
        撤销
      </button>
      <button
        :disabled="!editor.can().chain().focus().redo().run()"
        @click="editor.chain().focus().redo().run()"
      >
        重做
      </button>
      <button
        :class="{ 'is-active': editor.isActive('textStyle', { color: '#958DF1' }) }"
        @click="editor.chain().focus().setColor('#958DF1').run()"
      >
        紫色
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.yy-editor {
  .button-group {
    button {
      padding: 6px 12px;
      border-radius: 4px;
      background: #161616;
      color: #a1a1a1;
      cursor: pointer;
      margin: 2px;
    }
  }

  .tiptap-image {
    max-width: 100%;
    height: auto;

    &.loading {
      opacity: 0.5;
    }

    &.error {
      border: 1px solid #f44336;
    }
  }
}
/* Basic editor styles */
.tiptap {
  outline: none;
  padding: 16px;
  :first-child {
    margin-top: 0;
  }

  /* List styles */
  ul,
  ol {
    padding: 0 1rem;
    margin: 1.25rem 1rem 1.25rem 0.4rem;

    li p {
      margin-top: 0.25em;
      margin-bottom: 0.25em;
    }
  }

  /* Heading styles */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  ul,
  ol {
    margin: 0;
    line-height: 1.6;
    text-wrap: pretty;
  }

  h1 {
    font-size: 1.75rem;
    margin: 0;
  }

  h2 {
    font-size: 1.375rem;
  }

  h3 {
    font-size: 1.0625rem;
    font-weight: 400;
  }

  h4,
  h5,
  h6 {
    font-size: 1rem;
  }

  /* Code and preformatted text styles */
  code {
    background-color: var(--purple-light);
    border-radius: 0.4rem;
    color: var(--black);
    font-size: 0.85rem;
    padding: 0.25em 0.3em;
  }

  pre {
    background: var(--black);
    border-radius: 0.5rem;
    color: var(--white);
    font-family: 'JetBrainsMono', monospace;
    margin: 1.5rem 0;
    padding: 0.75rem 1rem;

    code {
      background: none;
      color: inherit;
      font-size: 0.8rem;
      padding: 0;
    }
  }

  blockquote {
    border-left: 3px solid var(--gray-3);
    margin: 1.5rem 0;
    padding-left: 1rem;
  }

  hr {
    border: none;
    border-top: 1px solid var(--gray-2);
    margin: 2rem 0;
  }
  /* Task list specific styles */
  ul[data-type='taskList'] {
    list-style: none;
    margin-left: 0;
    padding: 0;

    li {
      align-items: center;
      display: flex;

      > label {
        flex: 0 0 auto;
        margin-right: 0.5rem;
        user-select: none;
      }

      > div {
        flex: 1 1 auto;
      }
    }

    input[type='checkbox'] {
      cursor: pointer;
    }
  }
}
</style>
