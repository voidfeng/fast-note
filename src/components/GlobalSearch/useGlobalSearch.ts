import { ref } from 'vue'

const showGlobalSearch = ref(false)

export function useGlobalSearch() {
  return {
    showGlobalSearch,
  }
}
