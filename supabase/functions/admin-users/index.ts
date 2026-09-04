// @ts-nocheck -- Supabase Edge Runtime (Deno), no forma parte del build Vite.
import { createClient } from 'npm:@supabase/supabase-js@2.115.0';

type ClientFields = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
};

type AdminUserRequest =
  | ({ action: 'create_client'; password: string } & ClientFields)
  | ({ action: 'update_client'; userId: string } & ClientFields)
  | { action: 'deactivate_client' | 'reactivate_client'; userId: string };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const normalizeFields = (payload: ClientFields): ClientFields => ({
  nombre: payload.nombre?.trim(),
  apellido: payload.apellido?.trim(),
  email: payload.email?.trim().toLowerCase(),
  telefono: payload.telefono?.trim(),
  documento: payload.documento?.trim(),
});

const validFields = (fields: ClientFields) => Boolean(
  fields.nombre && fields.apellido && fields.email && fields.telefono && fields.documento
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email),
);

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sesión requerida' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ error: 'Configuración backend incompleta' }, 500);
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !caller) return json({ error: 'Sesión inválida' }, 401);
  const { data: callerProfile } = await admin
    .from('usuarios')
    .select('rol, activo')
    .eq('id', caller.id)
    .maybeSingle();
  if (callerProfile?.rol !== 'admin' || !callerProfile.activo) {
    return json({ error: 'Solo administración puede gestionar cuentas de clientes' }, 403);
  }

  let payload: AdminUserRequest;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida' }, 400);
  }

  if (payload.action === 'create_client') {
    const fields = normalizeFields(payload);
    if (!validFields(fields) || !payload.password || payload.password.length < 8) {
      return json({ error: 'Todos los campos y una contraseña de mínimo 8 caracteres son obligatorios' }, 400);
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: fields.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: fields,
    });
    if (error || !data.user) {
      console.error('admin_create_client_failed', { code: error?.code });
      return json({ error: error?.message || 'No fue posible crear el cliente' }, 400);
    }
    return json({ id: data.user.id }, 201);
  }

  if (!payload.userId) return json({ error: 'userId es obligatorio' }, 400);
  const { data: target } = await admin
    .from('usuarios')
    .select('id, rol')
    .eq('id', payload.userId)
    .maybeSingle();
  if (!target || target.rol !== 'cliente') return json({ error: 'Cliente no encontrado' }, 404);

  if (payload.action === 'update_client') {
    const fields = normalizeFields(payload);
    if (!validFields(fields)) return json({ error: 'Nombre, apellido, correo, teléfono y documento son obligatorios' }, 400);
    const { error: authError } = await admin.auth.admin.updateUserById(payload.userId, {
      email: fields.email,
      user_metadata: fields,
    });
    if (authError) return json({ error: authError.message }, 400);
    const { error: profileError } = await admin.from('usuarios').update({
      ...fields,
      rol: 'cliente',
    }).eq('id', payload.userId);
    if (profileError) return json({ error: profileError.message }, 400);
    return json({ id: payload.userId });
  }

  const active = payload.action === 'reactivate_client';
  const { error: authError } = await admin.auth.admin.updateUserById(payload.userId, {
    ban_duration: active ? 'none' : '876000h',
  });
  if (authError) return json({ error: authError.message }, 400);
  const { error: profileError } = await admin
    .from('usuarios')
    .update({ activo: active })
    .eq('id', payload.userId);
  if (profileError) return json({ error: profileError.message }, 400);
  return json({ id: payload.userId, active });
});
