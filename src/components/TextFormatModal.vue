<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { IonButton, IonIcon, IonModal, IonText } from '@ionic/vue'
import { closeCircle } from 'ionicons/icons'
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
    <div class="text-format-modal-content px-5">
      <div class="flex justify-between items-center">
        <IonText>
          <h3>格式</h3>
        </IonText>
        <IonButton fill="clear" class="close-btn mr-[-8px]" @click="$emit('update:isOpen', false)">
          <IonIcon slot="icon-only" :icon="closeCircle" />
        </IonButton>
      </div>
      <div class="font-size flex items-center justify-between">
        <IonButton
          :fill="editor.isActive('heading', { level: 1 }) ? undefined : 'clear'"
          size="small"
          @click="editor.chain().toggleHeading({ level: 1 }).run()"
        >
          <h1>标题</h1>
        </IonButton>
        <IonButton
          :fill="editor.isActive('heading', { level: 2 }) ? undefined : 'clear'"
          size="small"
          @click="editor.chain().toggleHeading({ level: 2 }).run()"
        >
          <h2>副标题</h2>
        </IonButton>
        <IonButton
          :fill="editor.isActive('heading', { level: 3 }) ? undefined : 'clear'"
          size="small"
          @click="editor.chain().toggleHeading({ level: 3 }).run()"
        >
          <h3>小标题</h3>
        </IonButton>
        <IonButton
          :fill="editor.isActive('paragraph') ? undefined : 'clear'"
          class="text-4"
          size="small"
          @click="editor.chain().setParagraph().run()"
        >
          正文
        </IonButton>
      </div>
      <div class="font-style flex">
        <IonButton
          :class="{ 'is-active': editor.isActive('bold') }"
          expand="full"
          @click="editor.chain().toggleBold().run()"
        >
          加粗
        </IonButton>
        <IonButton
          :class="{ 'is-active': editor.isActive('italic') }"
          expand="full"
          @click="editor.chain().toggleItalic().run()"
        >
          斜体
        </IonButton>
        <IonButton
          :class="{ 'is-active': editor.isActive('underline') }"
          expand="full"
          @click="editor.chain().toggleUnderline().run()"
        >
          下划线
        </IonButton>
        <IonButton
          :class="{ 'is-active': editor.isActive('strike') }"
          expand="full"
          @click="editor.chain().toggleStrike().run()"
        >
          删除线
        </IonButton>
      </div>
      <div class="flex">
        <div>
          <IonButton
            size="small"
            :class="{ 'is-active': editor.isActive('bulletList') }"
            @click="editor.chain().toggleBulletList().run()"
          >
            无序列表
          </IonButton>
          <IonButton
            size="small"
            :class="{ 'is-active': editor.isActive('orderedList') }"
            @click="editor.chain().toggleOrderedList().run()"
          >
            有序列表
          </IonButton>
        </div>
        <div>
          <IonButton
            size="small"
            :class="{ 'is-active': editor.isActive('listItem') }"
            @click="editor.chain().sinkListItem('listItem').run()"
          >
            右缩进
          </IonButton>
          <IonButton
            size="small"
            :class="{ 'is-active': editor.isActive('listItem') }"
            @click="editor.chain().liftListItem('listItem').run()"
          >
            左缩进
          </IonButton>
        </div>
      </div>
      <div>
        <IonButton
          size="small"
          :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
          @click="editor.chain().setTextAlign('left').run()"
        >
          左对齐
        </IonButton>
        <IonButton
          size="small"
          :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
          @click="editor.chain().setTextAlign('center').run()"
        >
          居中对齐
        </IonButton>
        <IonButton
          size="small"
          :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
          @click="editor.chain().setTextAlign('right').run()"
        >
          右对齐
        </IonButton>
      </div>
    </div>
  </IonModal>
</template>

<style lang="scss">
.text-format-modal-content {
  .close-btn {
    --color: #a1a1aa;
    ion-icon {
      font-size: 28px;
    }
  }
  .font-size {
    ion-button {
      --color: #fff;
      --padding-start: 10px;
      --padding-end: 10px;
    }
    h1,
    h2,
    h3 {
      margin: 0;
    }
  }
  .font-style {
    ion-button {
      flex: 1;
      --background: #2c2c2e;
      --color: #fff;
      --background-activated: #3d3c41;
    }
  }
}
</style>
