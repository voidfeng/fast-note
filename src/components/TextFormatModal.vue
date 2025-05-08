<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { IonButton, IonModal } from '@ionic/vue'
import { ref } from 'vue'

withDefaults(defineProps<{
  isOpen: boolean
  editor: Editor
}>(), {})

defineEmits(['update:isOpen'])

const modalRef = ref()
</script>

<template>
  <IonModal
    ref="modalRef"
    v-bind="$attrs"
    :is-open
    :initial-breakpoint="0.4"
    :breakpoints="[0, 0.4]"
    :backdrop-breakpoint="0.75"
    @did-dismiss="$emit('update:isOpen', false)"
  >
    <div>
      <div>
        <IonButton size="small" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
          标题
        </IonButton>
        <IonButton size="small" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
          副标题
        </IonButton>
        <IonButton size="small" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
          小标题
        </IonButton>
        <IonButton size="small" @click="editor.chain().focus().setParagraph().run()">
          正文
        </IonButton>
      </div>
      <div>
        <IonButton size="small" @click="editor.chain().focus().toggleBold().run()">
          加粗
        </IonButton>
        <IonButton size="small" @click="editor.chain().focus().toggleItalic().run()">
          斜体
        </IonButton>
        <IonButton size="small" @click="editor.chain().focus().toggleUnderline().run()">
          下划线
        </IonButton>
        <IonButton size="small" @click="editor.chain().focus().toggleStrikethrough().run()">
          删除线
        </IonButton>
      </div>
      <div class="flex">
        <div>
          <IonButton size="small" @click="editor.chain().focus().toggleBulletList().run()">
            无序列表
          </IonButton>
          <IonButton size="small" @click="editor.chain().focus().toggleOrderedList().run()">
            有序列表
          </IonButton>
        </div>
        <div>
          <IonButton size="small" @click="editor.chain().focus().sinkListItem('listItem').run()">
            右缩进
          </IonButton>
          <IonButton size="small" @click="editor.chain().focus().liftListItem('listItem').run()">
            左缩进
          </IonButton>
        </div>
      </div>
      <div>
        <IonButton size="small" @click="editor.chain().focus().setTextAlign('left').run()">
          左对齐
        </IonButton>
        <IonButton size="small" @click="editor.chain().focus().setTextAlign('center').run()">
          居中对齐
        </IonButton>
        <IonButton size="small" @click="editor.chain().focus().setTextAlign('right').run()">
          右对齐
        </IonButton>
      </div>
    </div>
  </IonModal>
</template>

<style scoped>
/* ion-modal {
  --height: auto;
} */
</style>
