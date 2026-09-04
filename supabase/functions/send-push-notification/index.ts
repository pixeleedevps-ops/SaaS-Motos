// @ts-nocheck -- Supabase Edge Runtime (Deno), no forma parte del build Vite.
import { createClient } from 'npm:@supabase/supabase-js@2.115.0';

type NotificationRow = {
  id: string;
  user_id: string;
  event_id: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
};

type FcmError = {
  error?: {
    status?: string;
    message?: string;
    details?: Array<{ errorCode?: string }>;
  };
  name?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const importPrivateKey = async (pem: string) => {
  const normalized = pem.replace(/\\n/g, '\n');
  const body = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
};

const getGoogleAccessToken = async (clientEmail: string, privateKey: string) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const payload = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(`Firebase OAuth failed (${response.status}): ${payload.error || 'unknown_error'}`);
  }
  return payload.access_token;
};

const isInvalidToken = (status: number, payload: FcmError) => {
  const errorCode = payload.error?.details?.find((detail) => detail.errorCode)?.errorCode;
  return status === 404
    || errorCode === 'UNREGISTERED'
    || (status === 400 && payload.error?.status === 'INVALID_ARGUMENT');
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ error: 'Supabase backend configuration is incomplete' }, 500);
  }

  const authorization = request.headers.get('Authorization') || '';
  const bearer = authorization.replace(/^Bearer\s+/i, '');
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const webhookSecret = request.headers.get('x-webhook-secret') || '';
  let internalRequest = bearer === serviceRoleKey;
  if (!internalRequest && webhookSecret) {
    const { data: verified, error: verificationError } = await admin
      .rpc('verify_push_webhook_secret', { p_secret: webhookSecret });
    internalRequest = !verificationError && verified === true;
  }

  if (!internalRequest) {
    if (!bearer) return json({ error: 'Authentication required' }, 401);
    const callerClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser(bearer);
    if (authError || !user) return json({ error: 'Invalid session' }, 401);
    const { data: profile } = await admin
      .from('usuarios')
      .select('rol, activo')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.activo || !['admin', 'empleado'].includes(profile.rol)) {
      return json({ error: 'Not authorized to process notifications' }, 403);
    }
  }

  let body: { notificationId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.notificationId) return json({ error: 'notificationId is required' }, 400);

  const { data: claimed, error: claimError } = await admin
    .rpc('claim_push_notification', { p_notification_id: body.notificationId });
  if (claimError) {
    console.error('push_claim_failed', { notification_id: body.notificationId, code: claimError.code });
    return json({ error: 'Unable to claim notification' }, 500);
  }
  const notification = claimed?.[0] as NotificationRow | undefined;
  if (!notification) return json({ processed: false, reason: 'already_processed_or_retry_limit' });

  const fail = async (message: string, status = 502) => {
    await admin.from('notifications').update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      processing_started_at: null,
      error_message: message.slice(0, 500),
    }).eq('id', notification.id);
    console.error('push_processing_failed', {
      notification_id: notification.id,
      code: message.split(':')[0],
      timestamp: new Date().toISOString(),
    });
    return json({ processed: false, notificationId: notification.id, error: message }, status);
  };

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('id, token, failure_count')
    .eq('user_id', notification.user_id)
    .eq('active', true);
  if (subscriptionsError) return fail('Push subscriptions query failed');
  if (!subscriptions?.length) return fail('No active push subscriptions', 200);

  const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID');
  const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const firebasePrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');
  if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
    return fail('Firebase Push Provider not configured', 503);
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(firebaseClientEmail, firebasePrivateKey);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Firebase authentication failed');
  }

  const stringData = Object.fromEntries(
    Object.entries(notification.data || {}).map(([key, value]) => [key, String(value)]),
  );
  const results = await Promise.all(subscriptions.map(async (subscription) => {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: subscription.token,
            data: {
              ...stringData,
              notification_id: notification.id,
              title: notification.title,
              message: notification.message,
            },
            webpush: {
              headers: { Urgency: 'high' },
              fcm_options: { link: stringData.url || '/' },
            },
          },
        }),
      },
    );
    const payload = await response.json() as FcmError;
    if (!response.ok) {
      const invalid = isInvalidToken(response.status, payload);
      await admin.from('push_subscriptions').update({
        active: invalid ? false : true,
        failure_count: Number(subscription.failure_count || 0) + 1,
        last_error: `${payload.error?.status || response.status}: ${payload.error?.message || 'FCM error'}`.slice(0, 500),
      }).eq('id', subscription.id);
      return { ok: false, invalid, status: response.status, error: payload.error?.status || 'FCM_ERROR' };
    }
    await admin.from('push_subscriptions').update({
      active: true,
      failure_count: 0,
      last_error: null,
      last_used_at: new Date().toISOString(),
    }).eq('id', subscription.id);
    return { ok: true, name: payload.name };
  }));

  const delivered = results.filter((result) => result.ok);
  const errors = results.filter((result) => !result.ok);
  if (!delivered.length) {
    return fail(`FCM delivery failed: ${errors.map((result) => result.error).join(', ')}`);
  }

  await admin.from('notifications').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    failed_at: null,
    processing_started_at: null,
    error_message: errors.length ? `${errors.length} device(s) failed` : null,
    provider_message_ids: delivered.map((result) => result.name).filter(Boolean),
  }).eq('id', notification.id);

  console.log('push_processed', {
    notification_id: notification.id,
    delivered: delivered.length,
    failed: errors.length,
    timestamp: new Date().toISOString(),
  });
  return json({
    processed: true,
    notificationId: notification.id,
    delivered: delivered.length,
    failed: errors.length,
  });
});
