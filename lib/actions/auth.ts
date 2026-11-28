'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email    = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=Email+and+password+are+required');
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const captchaToken = ((formData.get('captcha_token') as string) ?? '') || undefined;
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });

  if (error) {
    redirect('/login?error=Invalid+email+or+password');
  }

  redirect('/dashboard-redirect');
}

export async function signup(formData: FormData) {
  const email       = ((formData.get('email') as string) ?? '').trim();
  const password    = (formData.get('password') as string) ?? '';
  const confirm     = (formData.get('confirm_password') as string) ?? '';
  const displayName = ((formData.get('display_name') as string) ?? '').trim();
  const wantsTO     = formData.get('is_organiser') === 'on';

  if (!email || !password || !displayName) {
    redirect('/signup?error=' + encodeURIComponent('Name, email and password are required'));
  }
  if (password.length < 8) {
    redirect('/signup?error=' + encodeURIComponent('Password must be at least 8 characters'));
  }

  if (password !== confirm) {
    redirect('/signup?error=' + encodeURIComponent('Passwords do not match'));
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Only a display name is sent. Roles are never taken from sign-up data.
  const origin = (await headers()).get('origin') ?? '';
  const captchaToken = ((formData.get('captcha_token') as string) ?? '') || undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      data: { display_name: displayName, wants_organiser: wantsTO },
      emailRedirectTo: origin ? `${origin}/callback` : undefined,
    },
  });

  if (error) {
    redirect('/signup?error=' + encodeURIComponent(error.message));
  }

  // Signed in straight away (email confirmation switched off)
  if (data.session) {
    redirect('/dashboard-redirect');
  }

  // Email confirmation on: ask them to check their inbox
  redirect('/signup?sent=1' + (wantsTO ? '&to=1' : ''));
}

export async function logout() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect('/login');
}