import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rating, note } = await req.json()

  // Validate rating
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 10) {
    return NextResponse.json({ error: 'Rating harus angka 1-10' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  // BACKEND CONSTRAINT: cek 1 hari 1 input
  const { data: existing } = await supabase
    .from('moods')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Lo udah isi mood hari ini. Sampai besok ya!' },
      { status: 409 }
    )
  }

  // Hitung streak
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { data: lastMood } = await supabase
    .from('moods')
    .select('streak_day')
    .eq('user_id', user.id)
    .eq('date', yesterdayStr)
    .single()

  const streakDay = lastMood ? lastMood.streak_day + 1 : 1
  const xpEarned = 10 + (streakDay > 1 ? Math.min(streakDay * 2, 20) : 0) // bonus XP streak

  // Get response message dari DB (bukan hardcode)
  const { data: responseData } = await supabase
    .from('responses')
    .select('message')
    .lte('range_min', rating)
    .gte('range_max', rating)
    .single()

  // Insert mood
  const { data: mood, error: insertError } = await supabase
    .from('moods')
    .insert({
      user_id: user.id,
      date: today,
      rating,
      note: note?.trim() || null,
      xp_earned: xpEarned,
      streak_day: streakDay,
    })
    .select()
    .single()

  if (insertError) {
    // Handle unique constraint violation dari DB level juga
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Lo udah isi mood hari ini.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Gagal simpan mood' }, { status: 500 })
  }

  return NextResponse.json({
    mood,
    message: responseData?.message ?? 'Mood lo tercatat!',
    streakDay,
    xpEarned,
  })
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Cek apakah hari ini sudah isi
  const { data: todayMood } = await supabase
    .from('moods')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  // Ambil 7 hari terakhir untuk chart
  const { data: history } = await supabase
    .from('moods')
    .select('date, rating, streak_day, xp_earned')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(7)

  // Total XP
  const { data: xpData } = await supabase
    .from('moods')
    .select('xp_earned')
    .eq('user_id', user.id)

  const totalXP = xpData?.reduce((sum, m) => sum + m.xp_earned, 0) ?? 0

  return NextResponse.json({
    todayMood,
    history: history ?? [],
    totalXP,
    currentStreak: history?.[0]?.streak_day ?? 0,
  })
}
