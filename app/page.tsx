'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase-browser';

type Device = {
  id: string;
  device_uuid: string;
  device_name: string;
  model: string | null;
  android_version: string | null;
  battery: number;
  is_charging: boolean;
  last_seen: string;
};

type Notice = {
  id: number;
  device_id: string;
  app_name: string | null;
  title: string | null;
  content: string | null;
  posted_at: string;
};

const ONLINE_MS = 25_000;

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selected, setSelected] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const onlineCount = useMemo(
    () => devices.filter((d) => Date.now() - new Date(d.last_seen).getTime() < ONLINE_MS).length,
    [devices]
  );

  async function load() {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    setDevices((data ?? []) as Device[]);
    const { data: n } = await supabase.from('notifications').select('*').order('posted_at', { ascending: false }).limit(100);
    setNotices((n ?? []) as Notice[]);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    load();
    const channel = supabase
      .channel('prabu-remote-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'Login berhasil');
    setBusy(false);
  }

  async function logout() { await supabase.auth.signOut(); setSelected(null); }

  async function command(deviceId: string, action: 'HOME'|'BACK'|'RECENTS') {
    setBusy(true); setMessage('Mengirim perintah…');
    const { error } = await supabase.from('commands').insert({ device_id: deviceId, action });
    setMessage(error ? error.message : `${action} dikirim`);
    setBusy(false);
  }

  if (!session) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={login}>
          <div className="brand">PRABU <span>REMOTE</span></div>
          <p className="muted">Private Android device dashboard</p>
          <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy}>Masuk</button>
          {message && <div className="error">{message}</div>}
        </form>
      </main>
    );
  }

  const detail = selected;
  const selectedNotices = detail ? notices.filter((n) => n.device_id === detail.id).slice(0, 20) : [];

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="brand">PRABU <span>REMOTE</span></div><div className="subtitle">Android fleet control</div></div>
        <div className="top-actions"><div className="online-pill">● {onlineCount} ONLINE</div><button className="ghost" onClick={logout}>Keluar</button></div>
      </header>
      <section className="hero"><div><h1>Devices</h1><p>Setiap APK yang pertama kali dibuka akan otomatis masuk ke sini tanpa pairing.</p></div><button className="ghost" onClick={load}>Refresh</button></section>
      <section className="grid">
        {devices.map((d) => {
          const online = Date.now() - new Date(d.last_seen).getTime() < ONLINE_MS;
          return (
            <button className={`device-card ${selected?.id === d.id ? 'active' : ''}`} key={d.id} onClick={() => setSelected(d)}>
              <div className="card-head"><span className={`status-dot ${online ? 'online' : ''}`}></span><span>{online ? 'ONLINE' : 'OFFLINE'}</span></div>
              <h2>{d.device_name}</h2>
              <div className="model">{d.model || 'Android device'} · {d.android_version || 'Unknown Android'}</div>
              <div className="battery-row"><span>Battery</span><strong>{d.battery}% {d.is_charging ? '⚡' : ''}</strong></div>
              <div className="lastseen">Last seen {new Date(d.last_seen).toLocaleString('id-ID')}</div>
            </button>
          );
        })}
        {!devices.length && <div className="empty">Belum ada device online/terdaftar. Install APK dan buka sekali; device akan auto-enroll.</div>}
      </section>

      {detail && (
        <section className="detail">
          <div className="detail-main">
            <div className="detail-title"><div><span className="eyebrow">DEVICE</span><h2>{detail.device_name}</h2><p>{detail.model} · Android {detail.android_version}</p></div><button className="ghost" onClick={() => setSelected(null)}>Tutup</button></div>
            <div className="screen-placeholder"><div className="phone-icon">▯</div><h3>Live Screen — tahap berikutnya</h3><p>Fondasi kontrol sudah aktif. Modul MediaProjection + WebRTC belum diaktifkan di v0.1.</p></div>
            <div className="controls"><button onClick={() => command(detail.id, 'BACK')} disabled={busy}>◀ BACK</button><button onClick={() => command(detail.id, 'HOME')} disabled={busy}>● HOME</button><button onClick={() => command(detail.id, 'RECENTS')} disabled={busy}>▣ RECENTS</button></div>
          </div>
          <aside className="sidepanel"><div className="side-head"><h3>Notifications</h3><span>{selectedNotices.length}</span></div>{selectedNotices.map((n) => <div className="notice" key={n.id}><strong>{n.app_name || 'Notification'}</strong><div>{n.title}</div><p>{n.content}</p><small>{new Date(n.posted_at).toLocaleString('id-ID')}</small></div>)}{!selectedNotices.length && <div className="empty">Belum ada notifikasi.</div>}</aside>
        </section>
      )}

      {message && <div className="toast">{message}</div>}
    </main>
  );
}
