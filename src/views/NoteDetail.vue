<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonToolbar,
} from '@ionic/vue'
import { personCircle } from 'ionicons/icons'
import { getMessage } from '../data/messages'
import editor from '@/components/YYEditor.vue'
import { useCategory } from '@/hooks/useCategory'

const router = useRouter()
const route = useRoute()
const { addCategory } = useCategory()

const editorRef = ref()
const message = getMessage(parseInt(route.params.id as string, 10))

const getBackButtonText = () => {
  const win = window as any
  const mode = win && win.Ionic && win.Ionic.mode
  return mode === 'ios' ? '备忘录' : ''
}

async function onBlur() {
  console.log('onBlur')
  /**
   * 保存逻辑
   * 1. 新建时(id为0)
   *   - 如果内容为空，则不保存
   *   - 如果内容不为空，则保存
   * 2. 编辑时(id不为0)
   *   - 全部保存
   */
  if (route.params.id === '0') {
    const title = editorRef.value?.getTitle()
    const content = editorRef.value?.getContent()
    if (content) {
      console.log('新建时保存', content)
      const id = await addCategory({
        title,
        newstext: content,
        newstime: Date.now(),
        type: 'note',
        pid: 1,
      })
      router.replace(`/n/${id}`)
    }
  }
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :text="getBackButtonText()" default-href="/"></ion-back-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" v-if="message">
      <ion-item>
        <ion-icon aria-hidden="true" :icon="personCircle" color="primary"></ion-icon>
        <ion-label class="ion-text-wrap">
          <h2>
            {{ message.fromName }}
            <span class="date">
              <ion-note>{{ message.date }}</ion-note>
            </span>
          </h2>
          <h3>To: <ion-note>Me</ion-note></h3>
        </ion-label>
      </ion-item>

      <div class="ion-padding">
        <editor ref="editorRef" @blur="onBlur" />
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-item {
  --inner-padding-end: 0;
  --background: transparent;
}

ion-label {
  margin-top: 12px;
  margin-bottom: 12px;
}

ion-item h2 {
  font-weight: 600;

  /**
   * With larger font scales
   * the date/time should wrap to the next
   * line. However, there should be
   * space between the name and the date/time
   * if they can appear on the same line.
   */
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

ion-item .date {
  align-items: center;
  display: flex;
}

ion-item ion-icon {
  font-size: 42px;
  margin-right: 8px;
}

ion-item ion-note {
  font-size: 0.9375rem;
  margin-right: 12px;
  font-weight: normal;
}

p {
  line-height: 1.4;
}
</style>
