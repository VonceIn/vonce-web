import { createAdminClient } from '@/supabase/admin';
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const supabaseAdmin = await createAdminClient();

    try {
        console.log(new Date(Date.now()).toISOString());
        const { data, error } = await supabaseAdmin
            .from('match_queue')
            .select('*')
            .gte('last_seen_at', new Date(Date.now() - 5_000).toISOString())
            .gte('created_at', new Date(Date.now() - 120_000).toISOString());

        if (!data || error) {
            return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 400 });
        }

        if (data.length <= 1) {
            console.log('Only One User!');
        }

        return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
         return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 400 });
    }
}
