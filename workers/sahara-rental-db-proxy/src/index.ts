export interface Env {
	SUPABASE_URL: string;
}

// Generic reverse proxy to Supabase. Exists at the app's already-configured
// VITE_SUPABASE_URL (sahara-rental-db-proxy.barjees.workers.dev) so the client
// keeps calling this host for auth/rest/realtime instead of hitting Supabase directly.
function corsHeaders(request: Request): HeadersInit {
	return {
		'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
		'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
		'Access-Control-Allow-Headers':
			request.headers.get('Access-Control-Request-Headers') ||
			'authorization,apikey,content-type,x-client-info,prefer,range',
		'Access-Control-Expose-Headers': 'content-range,x-supabase-api-version',
		'Access-Control-Max-Age': '86400',
	};
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders(request) });
		}

		const incoming = new URL(request.url);
		const upstream = new URL(env.SUPABASE_URL);
		incoming.protocol = upstream.protocol;
		incoming.hostname = upstream.hostname;
		incoming.port = upstream.port;

		const proxyRequest = new Request(incoming.toString(), request);
		const isWebSocket = request.headers.get('Upgrade') === 'websocket';
		const response = await fetch(proxyRequest);

		if (isWebSocket) {
			// Pass the 101 Switching Protocols response (with its webSocket) straight through.
			return response;
		}

		const proxied = new Response(response.body, response);
		for (const [key, value] of Object.entries(corsHeaders(request))) {
			proxied.headers.set(key, value);
		}
		return proxied;
	},
};
