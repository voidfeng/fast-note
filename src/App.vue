<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { provide } from 'vue'
import { useDesktop } from './hooks/useDesktip'

const { noteDesktop } = useDesktop()
provide('noteDesktop', noteDesktop)
</script>

<template>
  <IonApp>
    <IonRouterOutlet />
  </IonApp>
</template>
