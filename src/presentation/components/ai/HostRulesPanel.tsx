import { useState } from 'react'
import type { AIRule } from '@/domain/entities'

interface HostRulesPanelProps {
  rules: AIRule[]
  onChange: (rules: AIRule[]) => void
}

const emptyForm = () => ({ name: '', content: '' })

export function HostRulesPanel({ rules, onChange }: HostRulesPanelProps) {
  const [editingId, setEditingId] = useState<string | null | 'new'>(null)
  const [form, setForm] = useState(emptyForm())

  const startAdd = () => {
    setEditingId('new')
    setForm(emptyForm())
  }

  const startEdit = (rule: AIRule) => {
    setEditingId(rule.id)
    setForm({ name: rule.name, content: rule.content })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm())
  }

  const saveRule = () => {
    const name = form.name.trim()
    const content = form.content.trim()
    if (!name || !content) return
    if (editingId === 'new') {
      onChange([...rules, { id: crypto.randomUUID(), name, content }])
    } else {
      onChange(rules.map((r) => (r.id === editingId ? { ...r, name, content } : r)))
    }
    cancelEdit()
  }

  const deleteRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id))
    if (editingId === id) cancelEdit()
  }

  const base = { fontFamily: "'Inter', sans-serif" } as const

  return (
    <div className="flex flex-col gap-2">
      {rules.length === 0 && editingId === null && (
        <p className="text-center text-[0.6rem] py-4" style={{ ...base, color: '#56687a' }}>
          No rules yet. Add a rule to guide this host's AI agent.
        </p>
      )}

      {rules.map((rule, i) => (
        <div
          key={rule.id}
          className="flex flex-col gap-1 rounded p-2.5"
          style={{
            background: '#161a1e',
            border: editingId === rule.id ? '1px solid rgba(168,232,255,0.3)' : '1px solid #252a30',
          }}
        >
          {editingId === rule.id ? (
            <>
              <input
                type="text"
                placeholder="Rule name"
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full outline-none text-[0.6875rem] text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded"
                style={{ ...base, background: '#0f1215', border: '1px solid #252a30' }}
              />
              <textarea
                placeholder="Rule content…"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={3}
                className="w-full outline-none text-[0.6875rem] text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded resize-none"
                style={{ ...base, background: '#0f1215', border: '1px solid #252a30' }}
              />
              <div className="flex gap-2 mt-0.5">
                <button
                  onClick={saveRule}
                  className="flex-1 py-1 rounded text-[0.6rem] font-semibold"
                  style={{ ...base, background: 'rgba(168,232,255,0.12)', color: '#a8e8ff' }}
                >
                  Save Changes
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 rounded text-[0.6rem] font-semibold"
                  style={{ ...base, background: 'rgba(255,255,255,0.04)', color: '#56687a' }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[0.55rem] font-bold tracking-widest uppercase"
                  style={{ ...base, color: '#56687a' }}
                >
                  Rule {i + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(rule)}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    title="Edit"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8a9bb0"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    title="Delete"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <span
                className="text-[0.6875rem] font-semibold"
                style={{ ...base, color: '#a8e8ff' }}
              >
                {rule.name}
              </span>
              <span className="text-[0.6rem] leading-relaxed" style={{ ...base, color: '#8a9bb0' }}>
                {rule.content}
              </span>
            </>
          )}
        </div>
      ))}

      {/* Add form */}
      {editingId === 'new' ? (
        <div
          className="flex flex-col gap-2 rounded p-2.5"
          style={{ background: '#161a1e', border: '1px solid rgba(168,232,255,0.3)' }}
        >
          <input
            type="text"
            placeholder="Rule name (e.g. What cannot do)"
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full outline-none text-[0.6875rem] text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded"
            style={{ ...base, background: '#0f1215', border: '1px solid #252a30' }}
          />
          <textarea
            placeholder="Rule content…"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={3}
            className="w-full outline-none text-[0.6875rem] text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded resize-none"
            style={{ ...base, background: '#0f1215', border: '1px solid #252a30' }}
          />
          <div className="flex gap-2 mt-0.5">
            <button
              onClick={saveRule}
              className="flex-1 py-1 rounded text-[0.6rem] font-semibold"
              style={{ ...base, background: 'rgba(168,232,255,0.12)', color: '#a8e8ff' }}
            >
              Add Rule
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-1 rounded text-[0.6rem] font-semibold"
              style={{ ...base, background: 'rgba(255,255,255,0.04)', color: '#56687a' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded text-[0.6rem] font-semibold transition-colors hover:border-[rgba(168,232,255,0.2)]"
          style={{
            ...base,
            background: 'transparent',
            border: '1px dashed #252a30',
            color: '#56687a',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add rule
        </button>
      )}
    </div>
  )
}
