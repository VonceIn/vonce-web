import { createAdminClient } from '@/supabase/admin';
import verifyUser from '@/utils/verifyUser';
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const supabaseAdmin = await createAdminClient();

    try {
        const result = await verifyUser(req);

        if ('status' in result) return result;

        const { user } = result;

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        return NextResponse.json({ profile }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}