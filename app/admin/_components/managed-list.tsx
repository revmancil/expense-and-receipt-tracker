'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Loader2, Pencil, Save } from 'lucide-react'
import { toast } from 'sonner'

interface ManagedRecord {
  id: string
  name: string
  isActive: boolean
  [key: string]: any
}

interface ManagedListProps {
  title: string
  endpoint: string // e.g. /api/categories
  typeField: string // 'categoryType' | 'partyType'
  typeLabel: string // 'Type'
  typeOptions: { value: string; label: string }[]
  addLabel: string
}

export default function ManagedList({
  title,
  endpoint,
  typeField,
  typeLabel,
  typeOptions,
  addLabel,
}: ManagedListProps) {
  const [records, setRecords] = useState<ManagedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState(typeOptions[0]?.value ?? '')
  const [adding, setAdding] = useState(false)

  // rename dialog
  const [editRec, setEditRec] = useState<ManagedRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('Failed to load')
      setRecords((await res.json()) ?? [])
    } catch (err: any) {
      console.error('Load error:', err)
      toast.error('Failed to load records')
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      toast.error('Enter a name')
      return
    }
    setAdding(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, [typeField]: newType }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to add')
      }
      toast.success('Added')
      setNewName('')
      setNewType(typeOptions[0]?.value ?? '')
      await load()
    } catch (err: any) {
      console.error('Add error:', err)
      toast.error(err?.message ?? 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  const patch = async (id: string, body: any) => {
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Update failed')
      }
      await load()
      return true
    } catch (err: any) {
      console.error('Patch error:', err)
      toast.error(err?.message ?? 'Update failed')
      return false
    }
  }

  const openEdit = (rec: ManagedRecord) => {
    setEditRec(rec)
    setEditName(rec.name)
  }

  const saveEdit = async () => {
    if (!editRec) return
    const name = editName.trim()
    if (!name) {
      toast.error('Enter a name')
      return
    }
    setSavingEdit(true)
    const ok = await patch(editRec.id, { name })
    setSavingEdit(false)
    if (ok) {
      toast.success('Renamed')
      setEditRec(null)
    }
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add form */}
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <Label className="mb-1 block text-xs">Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={addLabel} />
          </div>
          <div className="min-w-[150px]">
            <Label className="mb-1 block text-xs">{typeLabel}</Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={adding} className="gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </form>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : records.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-44">{typeLabel}</TableHead>
                  <TableHead className="w-28">Active</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id} className={rec.isActive ? '' : 'opacity-60'}>
                    <TableCell className="font-medium">{rec.name}</TableCell>
                    <TableCell>
                      <Select
                        value={rec[typeField]}
                        onValueChange={(v) => patch(rec.id, { [typeField]: v })}
                      >
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {typeOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rec.isActive}
                          onCheckedChange={(v) => patch(rec.id, { isActive: v })}
                        />
                        <span className="text-xs text-muted-foreground">
                          {rec.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(rec)} aria-label="Rename">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editRec} onOpenChange={(o) => !o && setEditRec(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">Rename</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="mb-1 block text-xs">Name</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit() }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Renaming updates this name on all existing transactions that use it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRec(null)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit} className="gap-2">
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
