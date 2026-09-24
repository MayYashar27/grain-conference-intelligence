import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'

/**
 * Dev-only middleware that serves POST /api/conferences using the same handler
 * as the Vercel function, so `npm run dev` has full write parity without the
 * Vercel CLI. The service-role key is read server-side here and never exposed
 * to the client bundle.
 */
/** Maps a dev API route to the server module + exported handler that serves it. */
const DEV_API_ROUTES: { path: string; module: string; handler: string }[] = [
  { path: '/api/conferences', module: '/server/createConference.ts', handler: 'handleCreateConference' },
  { path: '/api/discover', module: '/server/handleDiscover.ts', handler: 'handleDiscover' },
  { path: '/api/attendance', module: '/server/updateAttendance.ts', handler: 'handleUpdateAttendance' },
  { path: '/api/leads', module: '/server/captureLead.ts', handler: 'handleCaptureLead' },
  { path: '/api/contacts', module: '/server/updateContact.ts', handler: 'handleUpdateContact' },
  { path: '/api/research', module: '/server/researchLead.ts', handler: 'handleResearchLead' },
  { path: '/api/delete-lead', module: '/server/deleteLead.ts', handler: 'handleDeleteLead' },
  { path: '/api/resolve-contact-review', module: '/server/resolveContactReview.ts', handler: 'handleResolveContactReview' },
  { path: '/api/conference-enrich', module: '/server/enrichConference.ts', handler: 'handleEnrichConference' },
  { path: '/api/conference-update', module: '/server/updateConference.ts', handler: 'handleUpdateConference' },
  { path: '/api/conference-delete', module: '/server/deleteConference.ts', handler: 'handleDeleteConference' },
  { path: '/api/draft-email', module: '/server/draftEmail.ts', handler: 'handleDraftEmail' },
]

function devApiPlugin(): Plugin {
  return {
    name: 'grain-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const route = req.url && DEV_API_ROUTES.find((r) => req.url!.startsWith(r.path))
        if (!route) return next()

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }

        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const raw = Buffer.concat(chunks).toString('utf8')
          const body = raw ? JSON.parse(raw) : {}

          // /api/contacts serves BOTH contact and interaction edits (consolidated
          // to fit Vercel Hobby's 12-function limit). Mirror the production dispatch:
          // `target: 'interaction'` routes to the interaction handler.
          let module = route.module
          let handler = route.handler
          if (route.path === '/api/contacts' && body && body.target === 'interaction') {
            module = '/server/updateInteraction.ts'
            handler = 'handleUpdateInteraction'
          }

          // Load the handler through Vite so its TypeScript is transformed.
          const mod = await server.ssrLoadModule(module)
          const result = await mod[handler](body)

          res.statusCode = result.status
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(result.body))
        } catch (err) {
          server.config.logger.error(`[dev-api] ${String(err)}`)
          res.statusCode = 400
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid request.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env (no prefix filter) and expose the server-only vars to the
  // handler via process.env. VITE_-prefixed vars still reach the client; the
  // service-role key does NOT (it has no VITE_ prefix and is only read here).
  const env = loadEnv(mode, process.cwd(), '')
  if (env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL
  if (env.SUPABASE_SERVICE_ROLE_KEY)
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
  if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL

  return {
    plugins: [react(), tailwindcss(), devApiPlugin()],
  }
})
