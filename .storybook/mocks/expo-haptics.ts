// Native-only module with no web behaviour to reproduce — Card.ActionPill
// fires a light impact on press, which is a no-op in a browser.
export enum ImpactFeedbackStyle {
  Light = "light",
  Medium = "medium",
  Heavy = "heavy",
}

export const impactAsync = async (_style?: ImpactFeedbackStyle): Promise<void> => {}

export const selectionAsync = async (): Promise<void> => {}

export const notificationAsync = async (): Promise<void> => {}
