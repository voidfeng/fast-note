import { useUserPublicNotes } from './useUserPublicNotes'

export function useUserPublicNotesSync(username: string) {
  const { notes } = useUserPublicNotes(username)
}
