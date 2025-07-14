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

        // let queue = [
        //     {
        //         "created_at": "2025-07-14T05:56:30.050335+00:00",
        //         "id": "53b83369-abc6-4e92-a80f-d95cb61aafbf",
        //         "last_seen_at": "2025-07-14T05:57:00.130000+00:00",
        //         "user_id": "2dbd8341-ac91-4000-aeb0-478c68d821ff",
        //         "name": "Alice Chen"
        //     },
        //     {
        //         "created_at": "2025-07-14T05:55:10.112345+00:00",
        //         "id": "a1f2d654-23fa-498b-8c1c-2a814f14c8a3",
        //         "last_seen_at": "2025-07-14T05:56:45.300000+00:00",
        //         "user_id": "1aa0c7e1-1122-4f99-bc9e-087f7405b44d",
        //         "name": "Brian López"
        //     },
        //     {
        //         "created_at": "2025-07-14T05:57:00.000000+00:00",
        //         "id": "7e6123a3-662d-4e59-a9d3-1fd67660fbb8",
        //         "last_seen_at": "2025-07-14T05:57:40.450000+00:00",
        //         "user_id": "4e37be9a-f5a4-4e98-92e3-68f1749d5529",
        //         "name": "Chaitanya Rao"
        //     },
        //     {
        //         "created_at": "2025-07-14T05:54:00.789000+00:00",
        //         "id": "1b4e9c85-19e4-4900-92b2-119a0e6c6cb1",
        //         "last_seen_at": "2025-07-14T05:55:59.999000+00:00",
        //         "user_id": "3ac25a76-1eaf-4a6f-b938-046e55a869a3",
        //         "name": "Dana Smith"
        //     },
        //     {
        //         "created_at": "2025-07-14T05:58:10.950000+00:00",
        //         "id": "9f013f29-eccd-4edb-9289-8453b0310473",
        //         "last_seen_at": "2025-07-14T05:58:55.123000+00:00",
        //         "user_id": "c55d45c1-e6f7-4b9a-a6d7-51e8d3b78aef",
        //         "name": "Elias Bianchi"
        //     },
        //     {
        //         "created_at": "2025-07-14T05:56:15.310000+00:00",
        //         "id": "6c3abbd4-ffb5-4d5c-80c7-3a824b2a0cde",
        //         "last_seen_at": "2025-07-14T05:56:59.999999+00:00",
        //         "user_id": "dacd7230-bb9b-4a9a-bb9c-09cc94357f52",
        //         "name": "Fatima Al‑Qudsi"
        //     }
        // ];

        // Creating a shuffled queue
        const shuffledQueue = [...queue].sort(() => Math.random() - 0.5);

        const pairs = [];
        for (let i = 0; i < shuffledQueue.length - 1; i+=2) {
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
