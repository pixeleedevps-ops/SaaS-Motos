import { supabase } from '../lib/supabase';
import type { AppNotification } from '../types';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  status: AppNotification['status'];
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown> | null;
};

const mapNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  status: row.status,
  readAt: row.read_at || undefined,
  createdAt: row.created_at,
  url: typeof row.data?.url === 'string' ? row.data.url : undefined,
});

export const listNotifications = async (limit = 30): Promise<AppNotification[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, status, read_at, created_at, data')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as NotificationRow[]).map(mapNotification);
};

export const markNotificationRead = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const markAllNotificationsRead = async (ids: string[]) => {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
};
