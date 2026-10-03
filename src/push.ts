import { initializeApp, getApps, getApp } from 'firebase/app'
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import type { Messaging } from 'firebase/messaging'
import { request } from './api/client'
import { VAPID_PUBLIC_KEY, firebaseConfig } from './firebase-config'

const ENDPOINT = '/api/v1/notifications/device-tokens'
const STORAGE_KEY = 'agromed.push.token'
const USER_KEY = 'agromed.push.user'

function remembered(): { token: string | null; user: string | null } {
  try {
    return { token: localStorage.getItem(STORAGE_KEY), user: localStorage.getItem(USER_KEY) }
  } catch {

    return { token: null, user: null }
  }
}

function remember(token: string, user: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token)
    localStorage.setItem(USER_KEY, user)
  } catch {  }
}

function forget() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {  }
}

function vapidKeyLooksValid(key: string): boolean {
  return key.length === 87 && /^[A-Za-z0-9_-]+$/.test(key)
}

let messagingPromise: Promise<Messaging | null> | null = null

function messaging(): Promise<Messaging | null> {
  messagingPromise ??= (async () => {
    try {
      if (!(await isSupported())) return null
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
      return getMessaging(app)
    } catch (error) {
      console.warn('Push unavailable in this browser:', error)
      return null
    }
  })()
  return messagingPromise
}

async function serviceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  try {
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
  } catch (error) {
    console.warn('Could not register the messaging service worker:', error)
    return undefined
  }
}

export async function registerPush(userId: string): Promise<void> {
  const instance = await messaging()
  if (!instance) return

  try {
    if (Notification.permission === 'denied') {

      forget()
      return
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()
    if (permission !== 'granted') return

    if (!vapidKeyLooksValid(VAPID_PUBLIC_KEY)) {
      console.error(
        `Web push is disabled: the VAPID public key is ${VAPID_PUBLIC_KEY.length} characters, ` +
        'but a valid one is exactly 87. Copy it again from the Firebase console under ' +
        'Project settings -> Cloud Messaging -> Web configuration -> Web Push certificates.',
      )
      return
    }

    const registration = await serviceWorker()
    const token = await getToken(instance, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return

    const previous = remembered()
    if (previous.token === token && previous.user === userId) return

    if (previous.token && previous.token !== token) await remove(previous.token)

    await request<void>(ENDPOINT, { method: 'POST', body: { token, platform: 'web' } })
    remember(token, userId)
  } catch (error) {

    console.warn('Could not register for push notifications:', error)
  }
}

export async function unregisterPush(): Promise<void> {
  const { token } = remembered()
  try {
    if (token) await remove(token)
    const instance = await messaging()
    if (instance) await deleteToken(instance)
  } catch (error) {
    console.warn('Could not unregister push notifications:', error)
  } finally {
    forget()
  }
}

async function remove(token: string) {
  await request<void>(ENDPOINT, { method: 'DELETE', body: { token, platform: 'web' } })
}

export function onPushMessage(handler: () => void): () => void {
  let unsubscribe: (() => void) | null = null
  let cancelled = false

  void messaging().then(instance => {
    if (!instance || cancelled) return
    unsubscribe = onMessage(instance, () => handler())
  })

  return () => {
    cancelled = true
    unsubscribe?.()
  }
}
