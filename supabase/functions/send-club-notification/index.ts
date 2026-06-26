import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || ''
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY') || ''

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Unauthorized')

    // Parse the request payload
    const { club_id, title, message, url, post_type } = await req.json()
    if (!club_id || !title || !message) {
      throw new Error('Missing required fields')
    }

    // Ensure the user is a club admin of this club
    const { data: adminData, error: adminError } = await supabaseClient
      .from('club_admins')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('club_id', club_id)
      .single()

    if (adminError || !adminData) {
      throw new Error('You are not authorized to send notifications for this club')
    }

    // Fetch active members' external IDs
    const { data: members, error: membersError } = await supabaseClient
      .from('player_club_memberships')
      .select('player_id')
      .eq('club_id', club_id)
      .eq('status', 'active')

    if (membersError) throw membersError

    const externalIds = members.map(m => m.player_id)
    if (externalIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active members to notify' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send OneSignal Notification
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: externalIds,
      channel_for_external_user_ids: "push",
      headings: { en: title },
      contents: { en: message },
      url: url || `scorecaddie://club-life?clubId=${club_id}&type=${post_type}`,
      data: {
        club_id,
        post_type,
      }
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
