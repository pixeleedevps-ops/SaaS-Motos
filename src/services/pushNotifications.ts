import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import { supabase } from '../lib/supabase';

export type PushSetupResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'not_configured' | 'not_authenticated' | 'save_failed'; message: string };

const publicFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const isFirebasePublicConfigReady = () => Boolean(
  publicFirebaseConfig.apiKey
  && publicFirebaseConfig.projectId
  && publicFirebaseConfig.messagingSenderId
  && publicFirebaseConfig.appId
  && vapidKey,
);

const getDeviceIdentifier = () => {
  const storageKey = 'motopro_push_device_id';
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const identifier = crypto.randomUUID();
  localStorage.setItem(storageKey, identifier);
  return identifier;
};

const getFirebaseMessaging = async () => {
  if (!isFirebasePublicConfigReady() || !(await isSupported())) return null;
  const app = getApps().length ? getApp() : initializeApp(publicFirebaseConfig);
  return getMessaging(app);
};

export const enablePushNotifications = async (): Promise<PushSetupResult> => {
  if (!supabase) return { ok: false, reason: 'not_configured', message: 'Supabase no está configurado.' };
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported', message: 'Este navegador no admite notificaciones Push.' };
  }
  if (!isFirebasePublicConfigReady()) {
    return { ok: false, reason: 'not_configured', message: 'La configuración pública de Firebase aún no está cargada.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied', message: 'El permiso de notificaciones no fue concedido.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'not_authenticated', message: 'Debes iniciar sesión.' };

  const messaging = await getFirebaseMessaging();
  if (!messaging) return { ok: false, reason: 'unsupported', message: 'FCM no está disponible en este navegador.' };
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return { ok: false, reason: 'save_failed', message: 'Firebase no devolvió un token de dispositivo.' };

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    token,
    platform: 'web',
    device_identifier: getDeviceIdentifier(),
    active: true,
    failure_count: 0,
    last_error: null,
    last_used_at: new Date().toISOString(),
  }, { onConflict: 'token' });
  if (error) {
    console.error('No fue posible registrar el dispositivo Push', { code: error.code });
    return { ok: false, reason: 'save_failed', message: 'No fue posible registrar este dispositivo.' };
  }
  localStorage.setItem('motopro_push_token', token);
  return { ok: true };
};

export const disablePushNotifications = async () => {
  const token = localStorage.getItem('motopro_push_token');
  if (supabase && token) {
    await supabase.from('push_subscriptions').update({ active: false }).eq('token', token);
  }
  const messaging = await getFirebaseMessaging();
  if (messaging) await deleteToken(messaging);
  localStorage.removeItem('motopro_push_token');
};

export const listenForForegroundPush = async (listener: (payload: MessagePayload) => void) => {
  const messaging = await getFirebaseMessaging();
  return messaging ? onMessage(messaging, listener) : () => undefined;
};
