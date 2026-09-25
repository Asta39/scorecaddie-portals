'use client'

import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-client'

// Every dashboard screen, plus the sidebar, nav, notification bell and
// search, used to call supabase.auth.getUser() (a round trip to the Auth
// server) and then look up the same club_admins row. That was about six Auth
// calls and six identical queries per page load. This resolves both once per
// browser session and shares the result.
//
// Reading the user from the local session is fine here: this is only used to
// decide what to show. The proxy verifies the session on every request and
// row-level security enforces access on every query.

export type CurrentAdminRow = {
  club_id: string
  name: string | null
  email: string | null
  clubs: { name: string | null; course_id: string | null } | null
}

let userPromise: Promise<User | null> | null = null
let adminPromise: Promise<CurrentAdminRow | null> | null = null
let listening = false

function listen() {
  if (listening) return
  listening = true
  createClient().auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      clearCurrentAdmin()
    }
  })
}

export function clearCurrentAdmin() {
  userPromise = null
  adminPromise = null
}

export function getCurrentUser(): Promise<User | null> {
  listen()
  if (!userPromise) {
    userPromise = createClient()
      .auth.getSession()
      .then(({ data }) => data.session?.user ?? null)
      .catch(() => null)
  }
  return userPromise
}

async function fetchAdmin(): Promise<CurrentAdminRow | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const { data, error } = await createClient()
    .from('club_admins')
    .select('club_id, name, email, clubs(name, course_id)')
    .eq('user_id', user.id)
    .single()
  if (error || !data) return null
  const clubs = Array.isArray(data.clubs) ? data.clubs[0] ?? null : data.clubs
  return { ...data, clubs } as CurrentAdminRow
}

/** Same `{ data }` shape as the query it replaces. */
export async function getCurrentAdminRow(): Promise<{ data: CurrentAdminRow | null }> {
  listen()
  if (!adminPromise) {
    adminPromise = fetchAdmin().then(row => {
      // Don't cache a miss (e.g. a transient network error).
      if (!row) adminPromise = null
      return row
    })
  }
  return { data: await adminPromise }
}
