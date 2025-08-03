<script lang="ts" setup>
import { EditorContent } from '@tiptap/vue-3'
import { onMounted } from 'vue'
import { useEditor } from '@/composables/useEditor'

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

// 组件挂载时初始化编辑器
onMounted(() => {
  initEditor({
    onFocus: () => emit('focus'),
    onBlur: () => emit('blur'),
  })
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
