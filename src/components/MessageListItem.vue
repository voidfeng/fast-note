<script setup lang="ts">
import { IonIcon, IonItem, IonLabel, IonNote } from '@ionic/vue'
import { chevronForward, folderOutline } from 'ionicons/icons'

defineProps({
  data: Object,
})

const isIos = () => {
  const win = window as any
  return win && win.Ionic && win.Ionic.mode === 'ios'
}
</script>

<template>
  <ion-item v-if="data" :routerLink="'/n/' + data.id" :detail="false" class="list-item">
    <ion-icon v-if="data.type === 'folder'" :icon="folderOutline" class="mr-3" />
    <ion-label class="ion-text-wrap">
      <h2>
        {{ data.title }}
        <span class="date">
          <ion-note>{{ data.newstime }}</ion-note>
          <ion-icon
            aria-hidden="true"
            :icon="chevronForward"
            size="small"
            v-if="isIos()"
          />
        </span>
      </h2>
    </ion-label>
  </ion-item>
</template>

<style scoped>
.list-item ion-label {
  margin-top: 12px;
  margin-bottom: 12px;
}

.list-item h2 {
  font-weight: 600;
  margin: 0;

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

.list-item .date {
  align-items: center;
  display: flex;
}

.list-item ion-icon {
  color: #c9c9ca;
}

.list-item ion-note {
  font-size: 0.9375rem;
  margin-right: 8px;
  font-weight: normal;
}

.list-item ion-note.md {
  margin-right: 14px;
}
</style>
