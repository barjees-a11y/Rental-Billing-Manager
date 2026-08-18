export interface Env {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
}

// Queries a real, publicly-readable table so Postgres actually runs a query,
// which counts as activity for Supabase's 7-day inactivity auto-pause timer.
async function pingSupabase(env: Env): Promise<void> {
	const response = await fetch(`${env.SUPABASE_URL}/rest/v1/contracts?select=id&limit=1`, {
		headers: {
			apikey: env.SUPABASE_ANON_KEY,
			Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
			'X-Client-Info': 'sahara-cf-cron-keepalive',
		},
	});

	if (!response.ok) {
		throw new Error(`Supabase ping failed: ${response.status} ${await response.text()}`);
	}

	console.log(`Supabase keep-alive ping succeeded: ${response.status}`);
}

export default {
	async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(pingSupabase(env));
	},
	async fetch(): Promise<Response> {
		return new Response('supabase-keepalive worker: use the scheduled trigger, not HTTP', { status: 404 });
	},
};
