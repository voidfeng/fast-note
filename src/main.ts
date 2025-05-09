import { IonicVue } from '@ionic/vue'
import VConsole from 'vconsole'
import { createApp } from 'vue'
import App from './App.vue'
import { useDexie } from './hooks/useDexie'
import router from './router'

import 'core-js/stable/array/to-sorted'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'
/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'

import '@ionic/vue/css/typography.css'
/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

import '@ionic/vue/css/display.css'

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css'
/* Theme variables */
import './theme/variables.css'

import './css/common.scss'

import 'virtual:uno.css'

// eslint-disable-next-line no-new
new VConsole({ theme: 'dark' })

const { init } = useDexie()

const app = createApp(App)
  .use(IonicVue as any, {
    mode: 'ios',
  })
  .use(router)

Promise.all([init(), router.isReady()]).then(() => {
  app.mount('#app')
})
