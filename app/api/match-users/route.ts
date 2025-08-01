import { createAdminClient } from '@/supabase/admin';
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const supabaseAdmin = await createAdminClient();

    try {
        console.log(new Date(Date.now()).toISOString());
        const { data: queue, error } = await supabaseAdmin
            .from('match_queue')
            .select('*')
            .gte('last_seen_at', new Date(Date.now() - 5_000).toISOString())
            .gte('created_at', new Date(Date.now() - 120_000).toISOString());

        if (!queue || error) {
            return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 400 });
        }

        if (queue.length < 2) {
            console.log('[Edge] - Only One User!');
            return NextResponse.json({ message: 'Not enough users' }, { status: 200 });
        }

        // Creating a shuffled queue
        const shuffledQueue = [...queue].sort(() => Math.random() - 0.5);

        const pairs = [];
        for (let i = 0; i < shuffledQueue.length - 1; i += 2) {
            const user1 = shuffledQueue[i];
            const user2 = shuffledQueue[i + 1];

            // Check if the users still exits
            const [u1Check, u2Check] = await Promise.all([
                supabaseAdmin.from('match_queue').select('user_id').eq('user_id', user1.user_id),
                supabaseAdmin.from('match_queue').select('user_id').eq('user_id', user2.user_id),
            ]);

            if (!u1Check.data?.length || !u2Check.data?.length) {
                console.log('[Edge] - Skipped pair: one of the users cancelled');
                continue;
            }

            pairs.push([user1, user2]);
        }

        console.log(`[Edge] - Matching: ${pairs.length} pairs`);

        for (const [user1, user2] of pairs) {
            const { error: matchInsertError } = await supabaseAdmin
                .from('matches')
                .insert({
                    user1_id: user1.user_id,
                    user2_id: user2.user_id,
                });

            if (matchInsertError) {
                console.log(`[Edge] - Failed to insert match: ${matchInsertError.message} - ${matchInsertError.cause}`);
                continue;
            }

            await supabaseAdmin
                .from('match_queue')
                .delete()
                .in('user_id', [user1.user_id, user2.user_id]);
        }

        return NextResponse.json({ message: `Matched ${pairs.length} pairs` }, { status: 200 });
    } catch (error) {
         return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 400 });
    }
}
