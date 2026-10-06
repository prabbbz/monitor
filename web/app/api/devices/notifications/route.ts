import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-device-token');
    if (!token) return NextResponse.json({ error: 'Missing device token' }, { status: 401 });
    const body = await req.json();
    const db = getSupabaseAdmin();
    const { data: device } = await db.from('devices').select('id').eq('device_token', token).single();
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    const { error } = await db.from('notifications').insert({ device_id: device.id, package_name: body.packageName ?? null, app_name: body.appName ?? null, title: body.title ?? null, content: body.content ?? null, posted_at: body.postedAt ?? new Date().toISOString() });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message ?? 'Notification failed' }, { status: 500 }); }
}
