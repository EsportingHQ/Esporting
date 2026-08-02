    import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
    import { corsHeaders } from '../_shared/cors.ts'
    import { createAdminClient } from '../_shared/supabase.ts'

    // Helper to generate a slug from a string
    function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
    }

    serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Parse body
        const {
            // Series — either existing or new
            series_id,        // pass this if adding a new instance to existing series
            series_name,      // pass this to create a brand new series
            series_logo_url,
            series_description,

            // Instance details (required)
            instance_name,    // e.g. "UI eSports League Season 1 - 2025"
            edition_label,    // e.g. "Season 1", "2025"
            format,           // 'league' | 'knockout' | 'group+knockout' | 'ranking'
            starts_at,
            ends_at,
            prize_pool,
            description,
            banner_url,

            // Which games are covered (required — array of game_title slugs)
            // e.g. ['codm-mp', 'fc-mobile', 'pubg-br']
            game_title_slugs,

            // Initial stages (optional)
            // e.g. [{ name: 'Group Stage', stage_type: 'group', stage_order: 1, best_of: 1 }]
            stages
        } = await req.json()

        // 3. Validate required fields
        if (!instance_name || !format || !game_title_slugs || game_title_slugs.length === 0) {
            return new Response(
                JSON.stringify({
                error: 'instance_name, format, and game_title_slugs are required',
                hint: 'game_title_slugs must be a non-empty array e.g. ["codm-mp", "fc-mobile"]'
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Must provide either series_id or series_name — not neither
        if (!series_id && !series_name) {
            return new Response(
                JSON.stringify({
                error: 'Either series_id (existing series) or series_name (new series) is required'
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const adminClient = createAdminClient()

        // 4. Verify user
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await adminClient.auth.getUser(token)

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5. Check permission — must be organiser or super_admin
        const { data: roleData } = await adminClient
        .from('user_role_assignments')
        .select('roles(name)')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .is('comp_instance_id', null)

        const userRoles = (roleData as { roles: { name: string } }[] | null)
        ?.map(r => r.roles?.name) ?? []

        const canCreate = userRoles.includes('super_admin') || userRoles.includes('organiser')
        if (!canCreate) {
            return new Response(
                JSON.stringify({ error: 'Only organisers and admins can create competitions' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 6. Resolve the series
        let resolvedSeriesId = series_id

        if (!series_id && series_name) {
        // Check if a series with this name already exists
            const { data: existingSeries } = await adminClient
                .from('comp_series')
                .select('id, name')
                .eq('name', series_name)
                .is('deleted_at', null)
                .single()

            if (existingSeries) {
                // Series already exists — use it
                resolvedSeriesId = existingSeries.id
            } else {
                // Create a new series
                const seriesSlug = slugify(series_name)

                const { data: newSeries, error: seriesError } = await adminClient
                .from('comp_series')
                .insert({
                    name:        series_name,
                    slug:        seriesSlug,
                    logo_url:    series_logo_url ?? null,
                    description: series_description ?? null,
                    created_by:  user.id
                })
                .select()
                .single()

                if (seriesError) {
                // Slug conflict
                if (seriesError.code === '23505') {
                    return new Response(
                    JSON.stringify({
                        error: `A series with the name '${series_name}' already exists`,
                        hint: 'Use series_id to add a new instance to an existing series'
                    }),
                    { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }
                throw seriesError
                }

                resolvedSeriesId = newSeries.id
            }
        }

        // 7. Verify series exists if series_id was passed directly
        if (series_id) {
        const { data: seriesCheck } = await adminClient
            .from('comp_series')
            .select('id')
            .eq('id', series_id)
            .is('deleted_at', null)
            .single()

        if (!seriesCheck) {
            return new Response(
                JSON.stringify({ error: 'Series not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // 8. Generate instance slug and check uniqueness within series
        const instanceSlug = slugify(instance_name)

        const { data: existingInstance } = await adminClient
            .from('comp_instances')
            .select('id')
            .eq('series_id', resolvedSeriesId)
            .eq('slug', instanceSlug)
            .is('deleted_at', null)
            .single()

        if (existingInstance) {
            return new Response(
                JSON.stringify({
                error: `A competition instance with the name '${instance_name}' already exists in this series`
                }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 9. Validate game title slugs
        const { data: gameTitles, error: gameError } = await adminClient
            .from('game_titles')
            .select('id, slug, name')
            .in('slug', game_title_slugs)
            .eq('is_active', true)

        if (gameError) throw gameError

        // Check all requested slugs were found
        const foundSlugs = gameTitles?.map((g: { id: string, slug: string, name: string }) => g.slug) ?? []
        const notFound = game_title_slugs.filter(
            (s: string) => !foundSlugs.includes(s)
        )

        if (notFound.length > 0) {
            return new Response(
                JSON.stringify({
                error: `Game title slugs not found or inactive: ${notFound.join(', ')}`,
                valid_slugs: [
                    'fc-26', 'fc-mobile', 'efootball-mobile',
                    'codm-mp', 'codm-br', 'pubg-br', 'freefire-br'
                ]
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 10. Create the competition instance
        const { data: instance, error: instanceError } = await adminClient
            .from('comp_instances')
            .insert({
                series_id:     resolvedSeriesId,
                name:          instance_name,
                slug:          instanceSlug,
                edition_label: edition_label ?? null,
                format,
                status:        'draft',
                starts_at:     starts_at ?? null,
                ends_at:       ends_at ?? null,
                prize_pool:    prize_pool ?? null,
                description:   description ?? null,
                banner_url:    banner_url ?? null,
                organiser_id:  user.id
            })
            .select()
            .single()

        if (instanceError) throw instanceError

        // 11. Link game titles to this instance
        const gameTitleLinks = (gameTitles ?? []).map((g: { id: string }) => ({
            comp_instance_id: instance.id,
            game_title_id:    g.id
        }))

        const { error: linkError } = await adminClient
            .from('comp_game_titles')
            .insert(gameTitleLinks)

        if (linkError) throw linkError

        // 12. Create initial stages if provided
        const createdStages = []
        if (stages && Array.isArray(stages) && stages.length > 0) {
            for (const stage of stages) {
                if (!stage.name || !stage.stage_type || !stage.stage_order) continue

                const { data: newStage, error: stageError } = await adminClient
                .from('comp_stages')
                .insert({
                    comp_instance_id: instance.id,
                    name:             stage.name,
                    stage_type:       stage.stage_type,
                    stage_order:      stage.stage_order,
                    best_of:          stage.best_of ?? 1,
                    starts_at:        stage.starts_at ?? null,
                    ends_at:          stage.ends_at ?? null
                })
                .select()
                .single()

                if (stageError) throw stageError
                createdStages.push(newStage)
            }
        }

        // 13. Auto-copy BR points template for any BR games
        const brSlugs = ['codm-br', 'pubg-br', 'freefire-br']
        const brGames = (gameTitles ?? []).filter((g: { id: string, slug: string, name: string }) => brSlugs.includes(g.slug))

        for (const brGame of brGames) {
        // Get the default template for this BR game
        const { data: template } = await adminClient
            .from('br_points_template')
            .select('placement, placement_points, kill_points')
            .eq('game_title_id', brGame.id)
            .eq('is_default', true)
            .order('placement', { ascending: true })

        if (template && template.length > 0) {
            const configRows = template.map((t: { placement: number, placement_points: number, kill_points: number }) => ({
                comp_instance_id:  instance.id,
                game_title_id:     brGame.id,
                placement:         t.placement,
                placement_points:  t.placement_points,
                kill_points:       t.kill_points,
                created_by:        user.id
            }))

            await adminClient
                .from('br_points_config')
                .insert(configRows)
            }
        }

        // 14. Return full created competition
        return new Response(
            JSON.stringify({
                success: true,
                competition: {
                series_id:   resolvedSeriesId,
                instance:    instance,
                game_titles: gameTitles,
                stages:      createdStages
                },
                message: `Competition '${instance_name}' created successfully`
            }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('register-competition error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', detail: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
    })