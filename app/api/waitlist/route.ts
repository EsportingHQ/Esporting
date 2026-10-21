import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.from('waitlist').insert({
      email,
      source: 'landing_page',
    });

    if (error) {
      // 23505 is PostgreSQL unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: "You're already on the waitlist! We'll notify you when we go live.",
          alreadyRegistered: true,
        });
      }

      console.error('Waitlist insertion error:', error);
      return NextResponse.json(
        { error: 'Unable to save your spot. Please try again shortly.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You're on the list! We'll send you an email the moment we launch.",
    });
  } catch (err: any) {
    console.error('Waitlist endpoint exception:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
