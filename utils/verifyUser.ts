import { createClient } from "@/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export default async function verifyUser(req: NextRequest) {
    const supabasePublic = await createClient();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error } = await supabasePublic.auth.getUser(token);

    if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return { user };
}