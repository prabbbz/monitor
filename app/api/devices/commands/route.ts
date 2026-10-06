import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('x-device-token');
    if (!token) return NextResponse.json({ error: 'Missing device token' }, { status: 401 });
    const db = getSupabaseAdmin();
    const { data: device } = await db.from('devices').select('id').eq('device_token', token).single();
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const { data, error } = await db
      .from('commands')
      .select('id,action,created_at')
      .eq('device_id', device.id)
      .eq('status', 'pending')
      .order('id', { ascending: true })
      .limit(10);
    if (error) throw error;

    if (data?.length) {
      await db
        .from('commands')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('device_id', device.id)
        .in('id', data.map((x: any) => x.id));
    }
    return NextResponse.json({ commands: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Command poll failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-device-token');
    if (!token) return NextResponse.json({ error: 'Missing device token' }, { status: 401 });
    const { commandId, status } = await req.json();
    if (!commandId || !['done', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid acknowledgement' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: device } = await db.from('devices').select('id').eq('device_token', token).single();
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const patch: any = { status };
    if (status === 'done' || status === 'failed') patch.completed_at = new Date().toISOString();
    const { error } = await db
      .from('commands')
      .update(patch)
      .eq('id', commandId)
      .eq('device_id', device.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Command ack failed' }, { status: 500 });
  }
}
