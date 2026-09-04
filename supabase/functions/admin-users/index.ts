// @ts-nocheck -- this file is compiled by the Supabase Deno runtime, not Vite.
// Creates a Supabase Auth account and its public profile in one controlled
// operation. Deploy with: supabase functions deploy admin-users
// Required secret: SUPABASE_SERVICE_ROLE_KEY (never expose it to Vite/React).
import { createClient } from 'npm:@supabase/supabase-js@2';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

type CreateUserRequest = {
  email: string;
  password: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  documento?: string;
  rol: 'cliente' | 'vendedor' | 'mecanico' | 'admin';
  empleado?: { cargo: string; sede_id: string };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Método no permitido' }, { status: 405, headers: corsHeaders });

  const authorization = request.headers.get('Authorization');
  if (!authorization) return Response.json({ error: 'Sesión requerida' }, { status: 401, headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL')!;
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const callerClient = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
  const adminClient = createClient(url, serviceRoleKey);
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) return Response.json({ error: 'Sesión inválida' }, { status: 401, headers: corsHeaders });
  const { data: callerProfile } = await adminClient.from('usuarios').select('rol').eq('id', caller.id).single();
  if (callerProfile?.rol !== 'admin') return Response.json({ error: 'Solo un administrador puede crear cuentas' }, { status: 403, headers: corsHeaders });

  const payload = await request.json() as CreateUserRequest;
  if (!payload.email || !payload.password || payload.password.length < 8 || !payload.nombre || !payload.rol) {
    return Response.json({ error: 'Nombre, correo, rol y contraseña de mínimo 8 caracteres son obligatorios' }, { status: 400, headers: corsHeaders });
  }
  if (payload.rol !== 'cliente' && !payload.empleado) {
    return Response.json({ error: 'Cargo y sede son obligatorios para un empleado' }, { status: 400, headers: corsHeaders });
  }

  const { data: created, error: authError } = await adminClient.auth.admin.createUser({
    email: payload.email, password: payload.password, email_confirm: true,
    user_metadata: { nombre: payload.nombre },
  });
  if (authError || !created.user) return Response.json({ error: authError?.message || 'No se pudo crear la cuenta' }, { status: 400, headers: corsHeaders });

  const userId = created.user.id;
  const { error: profileError } = await adminClient.from('usuarios').update({
    nombre: payload.nombre, apellido: payload.apellido || null, telefono: payload.telefono || null,
    documento: payload.documento || null, rol: payload.rol,
  }).eq('id', userId);
  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    return Response.json({ error: profileError.message }, { status: 400, headers: corsHeaders });
  }
  if (payload.empleado) {
    const { error: employeeError } = await adminClient.from('empleados').insert({
      usuario_id: userId, cargo: payload.empleado.cargo, sede_id: payload.empleado.sede_id,
    });
    if (employeeError) return Response.json({ error: employeeError.message, userId }, { status: 400, headers: corsHeaders });
  }
  return Response.json({ id: userId, email: payload.email }, { status: 201, headers: corsHeaders });
});
