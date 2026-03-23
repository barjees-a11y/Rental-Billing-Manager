#!/usr/bin/env node

/**
 * Supabase Keep-Alive Ping Script
 * 
 * This script sends a lightweight ping to your Supabase project
 * to prevent it from entering deep sleep due to inactivity.
 */

import https from 'https';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Missing Supabase configuration in .env.local');
    console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

async function pingSupabase() {
    const timestamp = new Date().toISOString();
    const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
    
    console.log(`[${timestamp}] 🏓 Pinging Supabase project: ${projectRef}`);
    
    return new Promise((resolve, reject) => {
        // Make a lightweight request to the Supabase REST API
        // Using the root endpoint which doesn't consume database resources
        const url = new URL(SUPABASE_URL);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: '/rest/v1/',
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const statusCode = res.statusCode;
                
                if (statusCode >= 200 && statusCode < 400) {
                    console.log(`[${timestamp}] ✅ Ping successful! Status: ${statusCode}`);
                    console.log(`[${timestamp}] 📊 Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
                    resolve({ success: true, statusCode, timestamp });
                } else {
                    console.log(`[${timestamp}] ⚠️  Ping returned status: ${statusCode}`);
                    console.log(`[${timestamp}] 📊 Response: ${data.substring(0, 200)}`);
                    resolve({ success: false, statusCode, timestamp, error: data });
                }
            });
        });

        req.on('error', (error) => {
            console.error(`[${timestamp}] ❌ Ping failed with error: ${error.message}`);
            reject({ success: false, error: error.message, timestamp });
        });

        req.on('timeout', () => {
            console.error(`[${timestamp}] ❌ Ping timed out after 10 seconds`);
            req.destroy();
            reject({ success: false, error: 'Timeout', timestamp });
        });

        req.end();
    });
}

async function main() {
    console.log('🚀 Supabase Keep-Alive Service');
    console.log(`📍 Project URL: ${SUPABASE_URL}`);
    console.log('─'.repeat(50));
    
    try {
        const result = await pingSupabase();
        
        if (result.success) {
            console.log('─'.repeat(50));
            console.log('✨ Keep-alive ping completed successfully!');
            process.exit(0);
        } else {
            console.log('─'.repeat(50));
            console.log('⚠️  Ping completed with warnings');
            process.exit(1);
        }
    } catch (error) {
        console.error('─'.repeat(50));
        console.error('💥 Ping failed:', error.error || error.message);
        process.exit(1);
    }
}

// Run if called directly
main();
