<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useVisualViewport } from './hooks/useVisualViewport'

useVisualViewport(true)
</script>

<template>
  <IonApp>
    <IonRouterOutlet />
  </IonApp>
</template>
