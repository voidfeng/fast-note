export function getTime(date?: string) {
  return Math.floor(new Date(date || Date.now()).getTime() / 1000)
}