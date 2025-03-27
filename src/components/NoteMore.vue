<script setup lang="ts">
import { useCategory } from '@/hooks/useCategory';
import { useFiles } from '@/hooks/useFiles';
import { useIonRouter, IonPopover, IonList, IonIcon, IonLabel, IonItem } from '@ionic/vue';
import { trashOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router';

const route = useRoute()
const router = useIonRouter()
const { deleteCategory } = useCategory()
const { deleteFileByNoteId } = useFiles()

function onDelete() {
  console.log('delete', route.params.id)
  const id = route.params.id
  deleteCategory(parseInt(id as string)).then(() => {
    router.back()
  })
  deleteFileByNoteId(parseInt(id as string))
}
</script>

<template>
  <ion-popover :dismiss-on-select="true" trigger="more-trigger" trigger-action="click" class="note-more">
    <ion-list lines="full">
      <ion-item @click="onDelete">
        <ion-label class="danger">删除</ion-label>
        <ion-icon :icon="trashOutline" color="danger" size="small"></ion-icon>
      </ion-item>
    </ion-list>
  </ion-popover>
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
