import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import NewCompetitionClient from './NewCompetitionClient'

export default async function NewCompetitionPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_role_assignments')
    .select('roles(name)')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .is('comp_instance_id', null)

  const roles = (roleData as { roles: { name: string } }[] | null)
    ?.map(r => r.roles?.name) ?? []

  const canAccess = roles.includes('super_admin') || roles.includes('organiser')
  if (!canAccess) redirect('/dashboard-redirect')

  // Fetch existing series (for the dropdown — reuse or create new)
  const { data: series } = await supabase
    .from('comp_series')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  // Fetch all game titles for selection
  const { data: gameTitles } = await supabase
    .from('game_titles')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  return (
    <NewCompetitionClient
      existingSeries={series ?? []}
      gameTitles={gameTitles ?? []}
    />
  )
}
