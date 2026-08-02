'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Email+and+password+are+required')
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    redirect('/login?error=Invalid+email+or+password')
  }

  redirect('/dashboard-redirect')
}

export async function logout() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
  redirect('/login')
}