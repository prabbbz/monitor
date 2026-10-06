import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const installKey = req.headers.get('x-install-key');
    if (!installKey || installKey !== process.env.INSTALL_KEY) {
      return NextResponse.json({ error: 'Invalid install key' }, { status: 401 });
    }

    const { deviceUuid, deviceName, model, androidVersion, battery, isCharging } = body;
    if (!deviceUuid || !deviceName) {
      return NextResponse.json({ error: 'deviceUuid and deviceName required' }, { status: 400 });
    }

    const ownerId = process.env.OWNER_USER_ID;
    if (!ownerId) {
      return NextResponse.json({ error: 'OWNER_USER_ID missing' }, { status: 500 });
    }

    const db = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await db
      .from('devices')
      .select('id,device_token')
      .eq('device_uuid', deviceUuid)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const token = existing?.device_token ?? crypto.randomBytes(32).toString('hex');
    const { data, error } = await db.from('devices').upsert(
      {
        ...(existing?.id ? { id: existing.id } : {}),
        device_uuid: deviceUuid,
        owner_id: ownerId,
        device_name: deviceName,
        model: model ?? null,
        android_version: androidVersion ?? null,
        battery: Number(battery ?? 0),
        is_charging: Boolean(isCharging),
        last_seen: new Date().toISOString(),
        device_token: token,
      },
      { onConflict: 'device_uuid' }
    ).select('id,device_uuid,device_name,device_token').single();

    if (error) throw error;
    return NextResponse.json({
      ok: true,
      deviceId: data.id,
      deviceToken: token,
      deviceName: data.device_name,
      autoEnrolled: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Register failed' }, { status: 500 });
  }
}
