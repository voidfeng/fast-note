<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useDesktop } from './hooks/useDesktip';
import { provide } from 'vue';

const {noteDesktop} = useDesktop()
provide('noteDesktop', noteDesktop)
</script>

<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>
