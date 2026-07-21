'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { MapPin, UtensilsCrossed, Grid3x3, Plus, Trash2, Pencil, X, Check } from 'lucide-react'

type Location = {
  id: string
  name: string
  is_bookable: boolean
  sort_order: number
}

type TableRow = {
  id: string
  location_id: string
  table_number: string
  shape: 'round' | 'rectangular'
  seat_count: number
  is_active: boolean
}

type MenuItem = {
  id: string
  name: string
  description: string | null
  category: string
  price_kes: number | null
  chef_name: string | null
  is_new: boolean
  is_available: boolean
}

const CATEGORIES = ['starter', 'main', 'dessert', 'drink', 'special']

export default function RestaurantPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'locations' | 'tables' | 'menu'>('locations')
  const [clubId, setClubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [locations, setLocations] = useState<Location[]>([])
  const [tables, setTables] = useState<TableRow[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])

  useEffect(() => { loadClub() }, [])

  const loadClub = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: admin } = await supabase
      .from('club_admins')
      .select('club_id')
      .eq('user_id', user.id)
      .single()
    if (admin?.club_id) {
      setClubId(admin.club_id)
      await Promise.all([
        fetchLocations(admin.club_id),
        fetchMenu(admin.club_id),
      ])
    }
    setLoading(false)
  }

  const fetchLocations = async (cId: string) => {
    const { data } = await supabase
      .from('club_restaurant_locations')
      .select('*')
      .eq('club_id', cId)
      .order('sort_order')
    if (data) {
      setLocations(data)
      fetchTables(data.map(l => l.id))
    }
  }

  const fetchTables = async (locationIds: string[]) => {
    if (locationIds.length === 0) { setTables([]); return }
    const { data } = await supabase
      .from('club_restaurant_tables')
      .select('*')
      .in('location_id', locationIds)
      .order('table_number')
    if (data) setTables(data)
  }

  const fetchMenu = async (cId: string) => {
    const { data } = await supabase
      .from('club_menu_items')
      .select('*')
      .eq('club_id', cId)
      .order('sort_order')
    if (data) setMenu(data)
  }

  if (loading) {
    return <div className="p-8 text-text-muted">Loading…</div>
  }

  if (!clubId) {
    return <div className="card p-8 text-center text-text-muted m-8">No club linked to this account.</div>
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Restaurant</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage dining locations, tables, and menu — synced live to the mobile app
        </p>
      </div>

      <div className="flex border-b border-light mb-6">
        {([
          { key: 'locations', label: 'Locations', icon: MapPin },
          { key: 'tables', label: 'Tables', icon: Grid3x3 },
          { key: 'menu', label: 'Menu', icon: UtensilsCrossed },
        ] as const).map(t => (
          <button
            key={t.key}
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'locations' && (
        <LocationsTab
          clubId={clubId}
          locations={locations}
          onChange={() => fetchLocations(clubId)}
        />
      )}
      {activeTab === 'tables' && (
        <TablesTab
          locations={locations}
          tables={tables}
          onChange={() => fetchTables(locations.map(l => l.id))}
        />
      )}
      {activeTab === 'menu' && (
        <MenuTab
          clubId={clubId}
          menu={menu}
          onChange={() => fetchMenu(clubId)}
        />
      )}
    </div>
  )
}

function LocationsTab({ clubId, locations, onChange }: { clubId: string, locations: Location[], onChange: () => void }) {
  const supabase = createClient()
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [isBookable, setIsBookable] = useState(true)

  const create = async () => {
    if (!name.trim()) return
    const { error } = await supabase.from('club_restaurant_locations').insert({
      club_id: clubId,
      name: name.trim(),
      is_bookable: isBookable,
      sort_order: locations.length,
    })
    if (!error) {
      setName('')
      setIsBookable(true)
      setIsCreating(false)
      onChange()
    } else {
      alert('Failed to create location')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this location? Its tables will also be removed.')) return
    await supabase.from('club_restaurant_locations').delete().eq('id', id)
    onChange()
  }

  const toggleBookable = async (loc: Location) => {
    await supabase.from('club_restaurant_locations').update({ is_bookable: !loc.is_bookable }).eq('id', loc.id)
    onChange()
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-text-muted">
          Locations map to physical spaces — dining areas, sports bar, pavilion, board rooms. Mark meeting rooms as not bookable.
        </p>
        {!isCreating && (
          <button
            className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-2 text-sm font-medium"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} /> Add Location
          </button>
        )}
      </div>

      {isCreating && (
        <div className="flex items-center gap-3 mb-4 p-4 rounded-xl border border-light">
          <input
            autoFocus
            placeholder="e.g. Tai Lounge"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 bg-background border rounded-xl px-4 py-2 outline-none text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" checked={isBookable} onChange={e => setIsBookable(e.target.checked)} />
            Bookable
          </label>
          <button onClick={create} className="p-2 rounded-lg bg-primary text-white"><Check size={16} /></button>
          <button onClick={() => setIsCreating(false)} className="p-2 rounded-lg border border-light"><X size={16} /></button>
        </div>
      )}

      <div className="space-y-2">
        {locations.map(loc => (
          <div key={loc.id} className="flex items-center justify-between p-4 rounded-xl border border-light">
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-text-muted" />
              <span className="font-medium">{loc.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${loc.is_bookable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {loc.is_bookable ? 'Bookable' : 'Not bookable'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleBookable(loc)} className="text-xs text-text-muted hover:text-text px-2 py-1">
                Toggle bookable
              </button>
              <button onClick={() => remove(loc.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <div className="text-center py-10 text-text-muted text-sm">No locations yet — add your first one above.</div>
        )}
      </div>
    </div>
  )
}

function TablesTab({ locations, tables, onChange }: { locations: Location[], tables: TableRow[], onChange: () => void }) {
  const supabase = createClient()
  const [selectedLocation, setSelectedLocation] = useState<string>(locations[0]?.id || '')
  const [isCreating, setIsCreating] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [shape, setShape] = useState<'round' | 'rectangular'>('round')
  const [seatCount, setSeatCount] = useState(4)

  useEffect(() => {
    if (!selectedLocation && locations.length > 0) setSelectedLocation(locations[0].id)
  }, [locations])

  const create = async () => {
    if (!selectedLocation || !tableNumber.trim()) return
    const { error } = await supabase.from('club_restaurant_tables').insert({
      location_id: selectedLocation,
      table_number: tableNumber.trim(),
      shape,
      seat_count: seatCount,
    })
    if (!error) {
      setTableNumber('')
      setShape('round')
      setSeatCount(4)
      setIsCreating(false)
      onChange()
    } else {
      alert(error.message.includes('duplicate') ? 'Table number already exists in this location' : 'Failed to create table')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this table?')) return
    await supabase.from('club_restaurant_tables').delete().eq('id', id)
    onChange()
  }

  const toggleActive = async (t: TableRow) => {
    await supabase.from('club_restaurant_tables').update({ is_active: !t.is_active }).eq('id', t.id)
    onChange()
  }

  if (locations.length === 0) {
    return <div className="card p-8 text-center text-text-muted">Add a location first before creating tables.</div>
  }

  const tablesForLocation = tables.filter(t => t.location_id === selectedLocation)

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="bg-background border rounded-xl px-4 py-2 outline-none text-sm font-medium"
        >
          {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
        </select>
        {!isCreating && (
          <button
            className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-2 text-sm font-medium"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} /> Add Table
          </button>
        )}
      </div>

      {isCreating && (
        <div className="flex items-center gap-3 mb-4 p-4 rounded-xl border border-light flex-wrap">
          <input
            autoFocus
            placeholder="Table #"
            value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            className="w-28 bg-background border rounded-xl px-4 py-2 outline-none text-sm"
          />
          <select value={shape} onChange={e => setShape(e.target.value as any)} className="bg-background border rounded-xl px-4 py-2 outline-none text-sm">
            <option value="round">Round</option>
            <option value="rectangular">Rectangular</option>
          </select>
          <input
            type="number"
            min={1}
            value={seatCount}
            onChange={e => setSeatCount(parseInt(e.target.value) || 1)}
            className="w-20 bg-background border rounded-xl px-4 py-2 outline-none text-sm"
          />
          <span className="text-sm text-text-muted">seats</span>
          <button onClick={create} className="p-2 rounded-lg bg-primary text-white"><Check size={16} /></button>
          <button onClick={() => setIsCreating(false)} className="p-2 rounded-lg border border-light"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tablesForLocation.map(t => (
          <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-light">
            <div>
              <div className="font-medium">Table {t.table_number}</div>
              <div className="text-xs text-text-muted capitalize">{t.shape} · {t.seat_count} seats</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleActive(t)} className={`text-xs px-2 py-1 rounded-full ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {t.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => remove(t.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {tablesForLocation.length === 0 && (
          <div className="col-span-full text-center py-10 text-text-muted text-sm">No tables for this location yet.</div>
        )}
      </div>
    </div>
  )
}

function MenuTab({ clubId, menu, onChange }: { clubId: string, menu: MenuItem[], onChange: () => void }) {
  const supabase = createClient()
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: 'main', price_kes: '', chef_name: '', is_new: false })

  const create = async () => {
    if (!form.name.trim()) return
    const { error } = await supabase.from('club_menu_items').insert({
      club_id: clubId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      price_kes: form.price_kes ? parseFloat(form.price_kes) : null,
      chef_name: form.chef_name.trim() || null,
      is_new: form.is_new,
      sort_order: menu.length,
    })
    if (!error) {
      setForm({ name: '', description: '', category: 'main', price_kes: '', chef_name: '', is_new: false })
      setIsCreating(false)
      onChange()
    } else {
      alert('Failed to create menu item')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this menu item?')) return
    await supabase.from('club_menu_items').delete().eq('id', id)
    onChange()
  }

  const toggleAvailable = async (item: MenuItem) => {
    await supabase.from('club_menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    onChange()
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-text-muted">Dishes shown to players in the mobile app's Restaurant tab.</p>
        {!isCreating && (
          <button
            className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-2 text-sm font-medium"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} /> Add Dish
          </button>
        )}
      </div>

      {isCreating && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-4 rounded-xl border border-light">
          <input placeholder="Dish name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="bg-background border rounded-xl px-4 py-2 outline-none text-sm sm:col-span-2" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="bg-background border rounded-xl px-4 py-2 outline-none text-sm sm:col-span-2" rows={2} />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="bg-background border rounded-xl px-4 py-2 outline-none text-sm capitalize">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="Price (KES)" type="number" value={form.price_kes} onChange={e => setForm({ ...form, price_kes: e.target.value })}
            className="bg-background border rounded-xl px-4 py-2 outline-none text-sm" />
          <input placeholder="Chef name (optional)" value={form.chef_name} onChange={e => setForm({ ...form, chef_name: e.target.value })}
            className="bg-background border rounded-xl px-4 py-2 outline-none text-sm" />
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" checked={form.is_new} onChange={e => setForm({ ...form, is_new: e.target.checked })} />
            Mark as New
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={create} className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-2 text-sm font-medium"><Check size={16} /> Save</button>
            <button onClick={() => setIsCreating(false)} className="flex items-center gap-1.5 border border-light rounded-xl px-4 py-2 text-sm font-medium"><X size={16} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {CATEGORIES.map(cat => {
          const items = menu.filter(m => m.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat} className="mb-4">
              <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">{cat}</h3>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-light">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {item.name}
                        {item.is_new && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">New</span>}
                      </div>
                      <div className="text-xs text-text-muted">
                        {item.price_kes ? `KES ${item.price_kes}` : ''}
                        {item.chef_name ? ` · Chef ${item.chef_name}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleAvailable(item)} className={`text-xs px-2 py-1 rounded-full ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.is_available ? 'Available' : '86\'d'}
                      </button>
                      <button onClick={() => remove(item.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {menu.length === 0 && (
          <div className="text-center py-10 text-text-muted text-sm">No dishes yet — add your first one above.</div>
        )}
      </div>
    </div>
  )
}
