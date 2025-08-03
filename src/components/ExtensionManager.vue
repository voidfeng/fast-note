<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { ref } from 'vue'
import { useExtensions } from '@/hooks/useExtensions'

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  presentingElement: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isOpen'])

const { extensions, toggleExtension } = useExtensions()

const modal = ref()

function closeModal() {
  emit('update:isOpen', false)
}
</script>

<template>
  <IonModal
    ref="modal"
    :is-open="isOpen"
    :presenting-element="presentingElement"
    @did-dismiss="closeModal"
  >
    <IonHeader>
      <IonToolbar>
        <IonTitle>扩展管理</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="closeModal">
            <IonIcon :icon="closeOutline" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <IonList>
        <IonItem v-for="extension in extensions" :key="extension.id">
          <IonIcon
            v-if="extension.icon"
            slot="start"
            :icon="extension.icon"
            size="small"
          />
          <IonLabel>
            <h2>{{ extension.name }}</h2>
            <p>{{ extension.description }}</p>
          </IonLabel>
          <IonToggle
            :model-value="extension.enabled"
            @update:model-value="toggleExtension(extension.id)"
          />
        </IonItem>
      </IonList>
    </IonContent>
  </IonModal>
</template>
