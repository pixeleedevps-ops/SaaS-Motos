import { supabase } from '../lib/supabase';
import type { Customer } from '../types';

export type CustomerFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  document: string;
  password?: string;
};

const invokeAdminUsers = async (body: Record<string, unknown>) => {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { id: string; active?: boolean };
};

export const createCustomerAccount = (fields: CustomerFormData) => invokeAdminUsers({
  action: 'create_client',
  nombre: fields.firstName,
  apellido: fields.lastName,
  email: fields.email,
  telefono: fields.phone,
  documento: fields.document,
  password: fields.password,
});

export const updateCustomerAccount = (id: string, fields: CustomerFormData) => invokeAdminUsers({
  action: 'update_client',
  userId: id,
  nombre: fields.firstName,
  apellido: fields.lastName,
  email: fields.email,
  telefono: fields.phone,
  documento: fields.document,
});

export const setCustomerAccountActive = (id: string, active: boolean) => invokeAdminUsers({
  action: active ? 'reactivate_client' : 'deactivate_client',
  userId: id,
});

type SearchResult = {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  telefono: string | null;
  documento: string | null;
};

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('buscar_clientes', {
    p_query: query.trim(),
    p_limit: 15,
  });
  if (error) throw error;
  const rows = data as SearchResult[];
  const ids = rows.map((row) => row.id);
  const { data: vehicles, error: vehiclesError } = ids.length
    ? await supabase.from('motos_clientes').select('id, cliente_id, marca, modelo, anio, placa, cilindraje, vin, kilometraje, color, activo').in('cliente_id', ids).eq('activo', true)
    : { data: [], error: null };
  if (vehiclesError) throw vehiclesError;
  return rows.map((row) => ({
    id: row.id,
    name: [row.nombre, row.apellido].filter(Boolean).join(' '),
    firstName: row.nombre,
    lastName: row.apellido || '',
    cedula: row.documento || undefined,
    email: row.email,
    phone: row.telefono || '',
    address: '',
    city: '',
    isVIP: false,
    registrationDate: '',
    notes: '',
    motorcycles: (vehicles || []).filter((vehicle) => vehicle.cliente_id === row.id).map((vehicle) => ({
      id: vehicle.id,
      brand: vehicle.marca || '',
      model: vehicle.modelo || '',
      year: vehicle.anio || 0,
      licensePlate: vehicle.placa || '',
      cylinderCapacity: vehicle.cilindraje || '',
      vin: vehicle.vin || '',
      mileage: vehicle.kilometraje || 0,
      color: vehicle.color || '',
      isActive: vehicle.activo !== false,
    })),
    totalSpent: 0,
    completedServicesCount: 0,
    isActive: true,
  }));
};
