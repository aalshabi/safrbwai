'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import styles from './visitor-chat.module.css';

type Message = { role: 'user' | 'assistant'; content: string };
type Source = { title: string; href: string };
type Props = { name: string; welcome: string; handoffHref: string; handoffLabel: string; color?: string };

export default function VisitorChat({ name, welcome, handoffHref, handoffLabel, color = '#0B7D6F' }: Props) {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const input = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy]);
  const privatePage = /^\/(admin|dashboard|auth|login|ops|courier|track)(\/|$)/.test(pathname) || pathname.includes('/cold-chain-system/');
  useEffect(() => { if (privatePage) { pending.current?.abort(); pending.current = null; setBusy(false); setOpen(false); setMessages([]); setSources([]); setText(''); } }, [privatePage]);

  function close() { setOpen(false); trigger.current?.focus(); }
  function reset() {
    pending.current?.abort(); pending.current = null;
    setMessages([]); setSources([]); setText(''); setError(''); setBusy(false);
    input.current?.focus();
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (pending.current || !text.trim() || !consent) return;
    const next: Message[] = [...messages.slice(-8), { role: 'user', content: text.trim() }];
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError('');
    const timer = setTimeout(() => controller.abort(), 26000);
    try {
      const response = await fetch('/api/visitor-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, consent: true }), signal: controller.signal,
      });
      const data = await response.json();
      if (pending.current !== controller) return;
      if (!response.ok || typeof data.answer !== 'string') {
        throw new Error(typeof data.error === 'string' ? data.error : 'المساعد غير متاح الآن.');
      }
      setMessages([...next, { role: 'assistant', content: data.answer }]);
      setSources(Array.isArray(data.sources) ? data.sources.filter((source: Source) =>
        typeof source.title === 'string' && typeof source.href === 'string' &&
        source.href.startsWith('/') && !source.href.startsWith('//')) : []);
      setText('');
    } catch (failure) {
      if (pending.current === controller) setError(controller.signal.aborted
        ? 'انتهت مهلة الاتصال. يمكنك المحاولة مجددًا.'
        : failure instanceof Error ? failure.message : 'تعذر الاتصال. حاول مجددًا.');
    } finally {
      clearTimeout(timer);
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  }
  if (privatePage) return null;
  return <aside className={styles.root} dir="rtl" style={{ '--visitor-chat-color': color } as React.CSSProperties}>
    {open && <section className={styles.panel} role="dialog" aria-label={name}
      onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
      <header className={styles.header}>
        <div><strong>{name}</strong><small>مساعد آلي</small></div>
        <button type="button" onClick={reset} aria-label="مسح المحادثة">جديد</button>
        <button type="button" onClick={close} aria-label="إغلاق المحادثة">×</button>
      </header>
      <div className={styles.log} role="log" aria-live="polite" aria-relevant="additions">
        <p className={styles.bot}>{welcome}</p>
        {messages.map((message, index) => <p key={index} className={message.role === 'user' ? styles.user : styles.bot}>
          <span className={styles.speaker}>{message.role === 'user' ? 'أنت' : 'المساعد'}</span>{message.content}
        </p>)}
        {busy && <p role="status">جارٍ إعداد الرد…</p>}
        <div ref={end} />
      </div>
      {sources.length > 0 && <nav className={styles.sources} aria-label="صفحات مرجعية من الموقع">
        {sources.map((source) => <a key={source.href} href={source.href}>{source.title}</a>)}
      </nav>}
      <form className={styles.form} onSubmit={send}>
        <label htmlFor="visitor-chat-input">رسالتك</label>
        <textarea id="visitor-chat-input" ref={input} rows={2} maxLength={1600} value={text}
          disabled={busy} onChange={(event) => setText(event.target.value)} placeholder="كيف نساعدك؟" />
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          أوافق على إرسال الرسائل لخدمة الذكاء الاصطناعي. تجنّب البيانات الحساسة.
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" disabled={busy || !consent || !text.trim()}>{busy ? 'جارٍ الرد…' : 'إرسال'}</button>
      </form>
      <a className={styles.handoff} href={handoffHref}>{handoffLabel}</a>
    </section>}
    <button ref={trigger} type="button" className={styles.trigger} aria-expanded={open} aria-label={`افتح ${name}`}
      onClick={() => open ? close() : setOpen(true)}>💬 <span>{name}</span></button>
  </aside>;
}
