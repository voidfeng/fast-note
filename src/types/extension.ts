export interface Extension {
  id: string
  name: string
  description: string
  enabled: boolean
  icon?: string
}

export interface ExtensionState {
  extensions: Extension[]
  initialized: boolean
}
