// Database Webhook target for INSERTs on public.notifications.
// Configure EXPO_ACCESS_TOKEN as an Edge Function secret before deployment.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

type NotificationRecord = {
  id: string;
  customer_id: string | null;
  title: string;
  body: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

Deno.serve(async (request) => {
  const payload = await request.json();
  const notification = payload.record as NotificationRecord | undefined;
  if (!notification?.id || !notification.customer_id) return Response.json({ ignored: true });

  const query = new URL(`${supabaseUrl}/rest/v1/device_tokens`);
  query.searchParams.set('customer_id', `eq.${notification.customer_id}`);
  query.searchParams.set('active', 'eq.true');
  query.searchParams.set('select', 'token');
  const devices = await fetch(query, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } });
  const tokens = ((await devices.json()) as Array<{ token: string }>).map((device) => device.token);
  if (!tokens.length) return Response.json({ delivered: 0 });

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify(tokens.map((to) => ({ to, title: notification.title, body: notification.body, sound: 'default' }))),
  });
  const response = await expoResponse.json();
  await fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${notification.id}`, {
    method: 'PATCH',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ status: expoResponse.ok ? 'sent' : 'failed', sent_at: new Date().toISOString(), provider_response: response }),
  });
  return Response.json({ delivered: tokens.length, response }, { status: expoResponse.ok ? 200 : 502 });
});
