import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUsers } from '../context/UserContext';
import { api, ApiError } from '../lib/api';
import type { ChatMessage, SubscriptionBundle, UsageSummary } from '../lib/types';
import { Badge, Button, Card, ProgressBar, Spinner } from '../components/ui';
import { ChatIcon, ClockIcon, SendIcon, SparkleIcon } from '../components/icons';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function ChatPage() {
  const { currentUser } = useUsers();
  const userId = currentUser!.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [bundles, setBundles] = useState<SubscriptionBundle[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<{ message: string; quotaExceeded: boolean } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  async function loadAll() {
    setLoadingHistory(true);
    const [history, usageSummary, bundleList] = await Promise.all([
      api.get<ChatMessage[]>(`/chat/history?userId=${userId}`),
      api.get<UsageSummary>(`/chat/usage?userId=${userId}`),
      api.get<SubscriptionBundle[]>(`/subscriptions?userId=${userId}`),
    ]);
    setMessages([...history].reverse());
    setUsage(usageSummary);
    setBundles(bundleList);
    setLoadingHistory(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || sendingRef.current) return;
    sendingRef.current = true;

    setError(null);
    setSending(true);
    setQuestion('');

    try {
      const message = await api.post<ChatMessage>('/chat', { userId, question: q });
      setMessages((prev) => [...prev, message]);
      const [usageSummary, bundleList] = await Promise.all([
        api.get<UsageSummary>(`/chat/usage?userId=${userId}`),
        api.get<SubscriptionBundle[]>(`/subscriptions?userId=${userId}`),
      ]);
      setUsage(usageSummary);
      setBundles(bundleList);
    } catch (err) {
      if (err instanceof ApiError && err.body.code === 'QUOTA_EXCEEDED') {
        setError({ message: err.body.message, quotaExceeded: true });
      } else if (err instanceof ApiError) {
        setError({ message: err.body.message, quotaExceeded: false });
      } else {
        setError({ message: 'Something went wrong. Please try again.', quotaExceeded: false });
      }
      setQuestion(q);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const activeBundleQuota = bundles
    .filter((b) => b.status === 'ACTIVE')
    .reduce(
      (acc, b) => {
        if (b.remainingMessages === null) return { ...acc, unlimited: true };
        return { ...acc, remaining: acc.remaining + b.remainingMessages };
      },
      { remaining: 0, unlimited: false },
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card className="flex h-[calc(100vh-140px)] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <ChatIcon className="h-4.5 w-4.5 text-indigo-600" />
            <h1 className="text-sm font-semibold text-slate-800">AI Chat</h1>
          </div>
          {usage && (
            <Badge tone={usage.remainingFreeMessages > 0 ? 'green' : 'slate'}>
              {usage.remainingFreeMessages}/{usage.freeMessagesLimit} free left this month
            </Badge>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Spinner className="h-5 w-5" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
              <SparkleIcon className="h-8 w-8" />
              <p className="text-sm">Ask your first question — everyone gets 3 free per month.</p>
            </div>
          ) : (
            messages.map((m) => <MessagePair key={m.id} message={m} />)
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-400">
                <Spinner className="h-3.5 w-3.5" /> thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div
            className={`mx-5 mb-2 rounded-lg border px-3.5 py-2.5 text-sm ${
              error.quotaExceeded
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <p>{error.message}</p>
            {error.quotaExceeded && (
              <Link
                to="/subscriptions"
                className="mt-1 inline-block text-sm font-semibold text-amber-900 underline underline-offset-2"
              >
                View subscription bundles →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-slate-100 p-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Ask anything…"
            rows={1}
            disabled={sending}
            className="max-h-32 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50"
          />
          <Button type="submit" disabled={sending || !question.trim()} className="h-9 w-9 p-0">
            {sending ? <Spinner className="h-4 w-4" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            This month
          </h2>
          {usage && (
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Free messages</span>
                <span className="font-medium text-slate-700">
                  {usage.freeMessagesUsed}/{usage.freeMessagesLimit}
                </span>
              </div>
              <ProgressBar value={usage.freeMessagesUsed} max={usage.freeMessagesLimit} />
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Bundle credits</span>
              <span className="font-medium text-slate-700">
                {activeBundleQuota.unlimited ? 'Unlimited' : activeBundleQuota.remaining}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {bundles.filter((b) => b.status === 'ACTIVE').length} active bundle
              {bundles.filter((b) => b.status === 'ACTIVE').length === 1 ? '' : 's'}
            </p>
          </div>

          <Link to="/subscriptions">
            <Button variant="secondary" className="mt-4 w-full">
              Manage bundles
            </Button>
          </Link>
        </Card>

        <Card className="p-4">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <ClockIcon className="h-3.5 w-3.5" /> Recent activity
          </h2>
          <ul className="mt-3 space-y-2">
            {messages
              .slice(-5)
              .reverse()
              .map((m) => (
                <li key={m.id} className="text-xs text-slate-500">
                  <span className="line-clamp-1 text-slate-700">{m.question}</span>
                  <span className="text-slate-400">{timeAgo(m.createdAt)}</span>
                </li>
              ))}
            {messages.length === 0 && <li className="text-xs text-slate-400">No messages yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function MessagePair({ message }: { message: ChatMessage }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white">
          {message.question}
        </div>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-1.5">
          <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
            {message.answer}
          </div>
          <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
            <span>{message.tokens} tokens</span>
            <span>·</span>
            <Badge tone={message.source === 'FREE_QUOTA' ? 'indigo' : 'violet'}>
              {message.source === 'FREE_QUOTA' ? 'Free quota' : 'Bundle'}
            </Badge>
            <span>·</span>
            <span>{timeAgo(message.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
