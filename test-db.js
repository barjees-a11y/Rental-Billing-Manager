import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_schema_info');
    // If no rpc, we'll try something else
    if (error) {
        const { data: cols, error: colError } = await (supabase as any)
            .from('contracts')
            .select('quarterly_months')
            .limit(1);
        console.log('Sample data:', cols);
    }
}

checkSchema();
