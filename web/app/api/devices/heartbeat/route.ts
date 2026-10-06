import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-device-token');
    if (!token) return NextResponse.json({ error: 'Missing device token' }, { status: 401 });
    const body = await req.json();
    const db = getSupabaseAdmin();
    const { error } = await db.from('devices').update({
      device_name: body.deviceName ?? undefined, model: body.model ?? undefined,
      android_version: body.androidVersion ?? undefined, battery: Number(body.battery ?? 0),
      is_charging: Boolean(body.isCharging), last_seen: new Date().toISOString(),
    }).eq('device_token', token);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message ?? 'Heartbeat failed' }, { status: 500 }); }
}
