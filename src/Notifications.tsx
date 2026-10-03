import { useState } from 'react'
import { request } from './api/client'
import { useQuery } from './state/useQuery'
import { Async } from './state/Async'

interface Notification { id: string; title: string; body: string; sender: string; createdAt: string; sent: boolean }

export function Notifications({ locale, revision = 0 }: { locale: string; revision?: number }) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bn = locale === 'bn-BD'
  const q = useQuery(`notifications|${locale}|${cursor}|${revision}`, signal =>
    request<{ items: Notification[]; nextCursor?: string }>('/api/v1/notifications', { signal, query: { cursor, limit: 20 } }))
  async function remove(id?: string) {
    setBusy(true); setError('')
    try { await request(`/api/v1/notifications${id ? `/${id}` : ''}`, { method: 'DELETE' }); setCursor(null); q.reload() }
    catch { setError(bn ? 'আবার চেষ্টা করুন।' : 'Could not remove notifications. Please retry.') }
    finally { setBusy(false) }
  }
  return <>
    <button disabled={busy} onClick={() => remove()}>{bn ? 'সব পড়া হয়েছে' : 'Mark All as Read'}</button>
    {error && <p role="alert">{error}</p>}
    <Async query={q} emptyTitle={bn ? 'কোনো বিজ্ঞপ্তি নেই' : 'No notifications'}>
      {page => <div className="note-list">
        {!page.items.length && <p>{bn ? 'কোনো বিজ্ঞপ্তি নেই' : 'No notifications'}</p>}
        {page.items.map(n => <article key={n.id} className="note">
          <b>{n.title}</b><p>{n.body}</p><small>{n.sender} · {new Date(n.createdAt + (/Z$|[+-]\d\d:\d\d$/.test(n.createdAt) ? '' : 'Z')).toLocaleString(locale)}</small>
          <button disabled={busy} onClick={() => remove(n.id)}>{bn ? 'পড়া হয়েছে' : 'Mark as Read'}</button>
        </article>)}
        {cursor && <button onClick={() => setCursor(null)}>{bn ? 'প্রথম পৃষ্ঠা' : 'First page'}</button>}
        {page.nextCursor && <button onClick={() => setCursor(page.nextCursor!)}>{bn ? 'পরের পৃষ্ঠা' : 'Next page'}</button>}
      </div>}
    </Async>
  </>
}
