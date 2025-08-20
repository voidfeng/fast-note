<script lang="ts" setup>
import { EditorContent } from '@tiptap/vue-3'
// 导入 PhotoSwipe 5.x 版本
import PhotoSwipe from 'photoswipe'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useEditor } from '@/composables/useEditor'
import 'photoswipe/style.css'

const props = defineProps<{
  uuid: string
}>()

const emit = defineEmits(['focus', 'blur'])

// 使用新的编辑器组合式函数
const {
  editor,
  initEditor,
  insertFiles,
  getContentInfo,
  setContent,
  getContent,
  setEditable,
  setInputMode,
} = useEditor(props.uuid)

// PhotoSwipe 相关
const lightbox = ref<any>(null)

// 初始化PhotoSwipe
function initPhotoSwipe() {
  try {
    lightbox.value = new PhotoSwipeLightbox({
      gallery: '#pswp-gallery',
      children: 'a',
      pswpModule: PhotoSwipe,
      showHideAnimationType: 'fade',
      closeOnVerticalDrag: true,
      // 添加中文界面文本
      arrowPrevTitle: '上一张',
      arrowNextTitle: '下一张',
      closeTitle: '关闭',
      zoomTitle: '缩放',
    })
    lightbox.value.init()
  }
  catch (error) {
    console.error('初始化 PhotoSwipe 失败:', error)
  }
}

// 打开PhotoSwipe预览
function openPhotoSwipe(imageUrl: string, width: number, height: number) {
  try {
    // 移除可能存在的旧画廊元素
    const oldGallery = document.getElementById('pswp-gallery')
    if (oldGallery) {
      document.body.removeChild(oldGallery)
    }

    // 动态创建一个包含当前图片的画廊
    const galleryElement = document.createElement('div')
    galleryElement.id = 'pswp-gallery'
    galleryElement.style.display = 'none'
    document.body.appendChild(galleryElement)

    const linkElement = document.createElement('a')
    linkElement.href = imageUrl
    linkElement.dataset.pswpWidth = width.toString()
    linkElement.dataset.pswpHeight = height.toString()
    galleryElement.appendChild(linkElement)

    // 初始化并打开
    initPhotoSwipe()
    lightbox.value.loadAndOpen(0)
  }
  catch (error) {
    console.error('打开图片预览失败:', error)
  }
}

// 通过 provide 向子组件提供预览功能
provide('openPhotoSwipe', openPhotoSwipe)

// 组件挂载时初始化编辑器
onMounted(() => {
  initEditor({
    onFocus: () => emit('focus'),
    onBlur: () => emit('blur'),
  })
})

// 组件卸载时清理资源
onUnmounted(() => {
  try {
    if (lightbox.value) {
      lightbox.value.destroy()
      lightbox.value = null
    }

    // 移除临时创建的画廊元素
    const galleryElement = document.getElementById('pswp-gallery')
    if (galleryElement) {
      document.body.removeChild(galleryElement)
    }
  }
  catch (error) {
    console.error('清理 PhotoSwipe 资源失败:', error)
  }
})

/**
 * 处理文件输入事件
 */
async function handleFileInput(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) {
    await insertFiles(files)
  }
}

// 暴露给父组件的方法和属性
defineExpose({
  getContent,
  getTitle: getContentInfo,
  setContent,
  setEditable,
  setInputMode,
  editor,
  insertFile: handleFileInput,
})
</script>

<template>
  <div v-if="editor" class="yy-editor">
    <EditorContent :editor="editor as any" />
    <div class="button-group">
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
      border: 1px solid var(--danger);
    }
  }
}
/* Basic editor styles */
.tiptap {
  outline: none;
  padding: 16px;
  padding-bottom: 200px;
  :first-child {
    margin-top: 0;
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
    background-color: #202329;
    border-radius: 0.4rem;
    padding: 0.25em 0.3em;
  }

  pre {
    background: #161b22;
    border-radius: 0.5rem;
    font-family: 'JetBrainsMono', monospace;
    margin: 8px 0;
    padding: 0.75rem 1rem;
    line-height: 1.45;
    font-size: 14px;
    code {
      background: none;
      padding: 0;
    }
  }

  blockquote {
    border-left: 3px solid var(--gray-3);
    margin: 1.5rem 0;
    padding-left: 1rem;
  }
  // 任务列表
  ul[data-type='taskList'] {
    list-style: none;
    margin-left: 0;
    padding: 0;

    li {
      align-items: center;
      display: flex;
      &[data-checked='true'] {
        label {
          background: url('/public/icons/check-circle-fill.svg') no-repeat center center;
          background-size: 100%;
        }
      }
      &[data-checked='false'] {
        label {
          background: url('/public/icons/circle.svg') no-repeat center center;
          background-size: 100%;
        }
      }

      > label {
        display: inline-flex;
        width: 22px;
        height: 22px;
        margin-right: 0.5rem;
        transform: translateY(-0.1em);
        cursor: pointer;
        //   flex: 0 0 auto;
        //   margin-right: 0.5rem;
        //   user-select: none;
      }

      > div {
        flex: 1 1 auto;
      }
    }

    input[type='checkbox'] {
      opacity: 0;
      pointer-events: none;
    }
  }
  // 列表
  ul,
  ol {
    padding: 0;

    li p {
      margin-top: 0.25em;
      margin-bottom: 0.25em;
    }
  }
  // 有序列表
  ol {
    padding-left: 28px;
    li {
      ol {
        li {
          list-style-type: lower-alpha;
          ol {
            li {
              list-style-type: decimal-leading-zero;
            }
          }
        }
      }
    }
  }
  // 无序列表
  ul {
    padding-left: 28px;
    li {
      &::marker {
        font-size: 20px;
      }
    }
  }
  table {
    border-collapse: collapse;
    border-spacing: 0;
    border: 1px solid var(--c-blue-gray-700);
    width: 100%;
    margin: 10px 0;
    td {
      border: 1px solid var(--c-blue-gray-700);
      padding: 8px;
    }
  }
}
</style>
