import { useDashboardData } from '@/hooks/useDashboardData';
import type { Test } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { TestDialog } from '@/components/dialogs/TestDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatCard } from '@/components/StatCard';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconSearch, IconPencil, IconTrash,
  IconUser, IconMail, IconMessage, IconUsers, IconInbox,
  IconX,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a021f99ac68760cbbc310db';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const { test, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Test | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Test | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return test;
    return test.filter(r =>
      [r.fields.vorname, r.fields.nachname, r.fields.email, r.fields.nachricht]
        .some(v => v?.toLowerCase().includes(q))
    );
  }, [test, search]);

  const withMessage = useMemo(() => test.filter(r => r.fields.nachricht).length, [test]);

  const handleCreate = async (fields: Test['fields']) => {
    await LivingAppsService.createTestEntry(fields);
    fetchAll();
  };

  const handleUpdate = async (fields: Test['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateTestEntry(editRecord.record_id, fields);
    if (selected?.record_id === editRecord.record_id) {
      setSelected({ ...editRecord, fields: { ...editRecord.fields, ...fields } });
    }
    fetchAll();
    setEditRecord(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteTestEntry(deleteTarget.record_id);
    if (selected?.record_id === deleteTarget.record_id) setSelected(null);
    fetchAll();
    setDeleteTarget(null);
  };

  // ALL hooks must be before early returns
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const initials = (r: Test) => {
    const v = r.fields.vorname?.[0] ?? '';
    const n = r.fields.nachname?.[0] ?? '';
    return (v + n).toUpperCase() || '?';
  };

  const fullName = (r: Test) => {
    const parts = [r.fields.vorname, r.fields.nachname].filter(Boolean);
    return parts.join(' ') || 'Unbekannt';
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Kontakte gesamt"
          value={String(test.length)}
          description="Alle Einträge"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mit Nachricht"
          value={String(withMessage)}
          description="Haben eine Nachricht"
          icon={<IconMessage size={18} className="text-muted-foreground" />}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            title="Suchergebnisse"
            value={String(filtered.length)}
            description={search ? `für „${search}"` : 'Alle angezeigt'}
            icon={<IconSearch size={18} className="text-muted-foreground" />}
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[500px]">
        {/* Left: Contact list */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Search + Add */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <Input
                placeholder="Suchen…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => { setEditRecord(null); setDialogOpen(true); }}
              className="shrink-0"
            >
              <IconPlus size={16} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Neu</span>
            </Button>
          </div>

          {/* List */}
          <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <IconInbox size={40} stroke={1.5} />
                <p className="text-sm">{search ? 'Keine Treffer' : 'Noch keine Kontakte'}</p>
                {!search && (
                  <Button size="sm" variant="outline" onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
                    <IconPlus size={14} className="mr-1" /> Ersten Kontakt anlegen
                  </Button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map(r => (
                  <li
                    key={r.record_id}
                    onClick={() => setSelected(r)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      selected?.record_id === r.record_id
                        ? 'bg-primary/8 border-l-2 border-primary'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(r)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{fullName(r)}</p>
                      {r.fields.email && (
                        <p className="text-xs text-muted-foreground truncate">{r.fields.email}</p>
                      )}
                    </div>
                    {r.fields.nachricht && (
                      <IconMessage size={14} className="text-muted-foreground shrink-0" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden h-full flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-border flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                  {initials(selected)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold truncate">{fullName(selected)}</h2>
                  {selected.fields.email && (
                    <a
                      href={`mailto:${selected.fields.email}`}
                      className="text-sm text-primary hover:underline truncate block"
                      onClick={e => e.stopPropagation()}
                    >
                      {selected.fields.email}
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => { setEditRecord(selected); setDialogOpen(true); }}
                  >
                    <IconPencil size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </div>
              </div>

              {/* Fields */}
              <div className="px-6 py-5 flex-1 space-y-5">
                {selected.fields.vorname && (
                  <DetailField
                    icon={<IconUser size={16} className="text-muted-foreground shrink-0" />}
                    label="Vorname"
                    value={selected.fields.vorname}
                  />
                )}
                {selected.fields.nachname && (
                  <DetailField
                    icon={<IconUser size={16} className="text-muted-foreground shrink-0" />}
                    label="Nachname"
                    value={selected.fields.nachname}
                  />
                )}
                {selected.fields.email && (
                  <DetailField
                    icon={<IconMail size={16} className="text-muted-foreground shrink-0" />}
                    label="E-Mail-Adresse"
                    value={selected.fields.email}
                    isEmail
                  />
                )}
                {selected.fields.nachricht && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <IconMessage size={16} className="text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nachricht</span>
                    </div>
                    <div className="pl-6">
                      <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/40 rounded-xl px-4 py-3 leading-relaxed">
                        {selected.fields.nachricht}
                      </p>
                    </div>
                  </div>
                )}
                {!selected.fields.vorname && !selected.fields.nachname && !selected.fields.email && !selected.fields.nachricht && (
                  <p className="text-muted-foreground text-sm">Keine Daten vorhanden.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-card shadow-sm border border-border h-full flex flex-col items-center justify-center gap-3 text-muted-foreground py-20">
              <IconUser size={48} stroke={1.5} />
              <p className="text-sm">Kontakt auswählen</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <TestDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleUpdate : handleCreate}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Test']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Test']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Kontakt löschen"
        description={`„${deleteTarget ? fullName(deleteTarget) : ''}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DetailField({
  icon,
  label,
  value,
  isEmail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEmail?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="pl-6">
        {isEmail ? (
          <a href={`mailto:${value}`} className="text-sm text-primary hover:underline">{value}</a>
        ) : (
          <p className="text-sm text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-full min-h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" /> Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Repariere...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte Support kontaktieren.</p>}
    </div>
  );
}
