<script setup lang="ts">
import { useFiles } from '@/hooks/useFiles'
import { useNote } from '@/hooks/useNote'
import { IonIcon, IonItem, IonLabel, IonList, IonPopover, useIonRouter } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router'

const route = useRoute()
const router = useIonRouter()
const { deleteNote } = useNote()
const { deleteFileByNoteId } = useFiles()

function onDelete() {
  console.log('delete', route.params.id)
  const id = route.params.id
  deleteNote(id as string).then(() => {
    router.back()
  })
  deleteFileByNoteId(Number.parseInt(id as string))
}
</script>

<template>
  <IonPopover :dismiss-on-select="true" trigger="more-trigger" trigger-action="click" class="note-more">
    <IonList lines="full">
      <IonItem @click="onDelete">
        <IonLabel class="danger">
          删除
        </IonLabel>
        <IonIcon :icon="trashOutline" color="danger" size="small" />
      </IonItem>
    </IonList>
  </IonPopover>
</template>

<style lang="scss">
ion-popover.note-more {
  --background: #111;
  --box-shadow: 0 5px 10px 0 rgba(0, 0, 0, 0.6);
}
.note-more {
  .list-ios {
    --ion-item-background: #111;
  }
}
</style>
