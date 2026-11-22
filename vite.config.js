import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The game's own dev server (see game/vite.config.js). Deliberately an IPv4
// literal, not "localhost": the game server binds 0.0.0.0, which is IPv4 only,
// while Node resolves "localhost" to ::1 first — so a localhost target gets
// ECONNREFUSED ::1:8000 and the iframe renders white.
const GAME_DEV_TARGET = 'http://127.0.0.1:8000'

// Shown inside the iframe when the game's dev server is not reachable, instead
// of a blank frame and an error only in the terminal.
const proxyErrorPage = (error) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Game dev server not running</title>
    <style>
      body { margin: 0; display: grid; place-items: center; min-height: 100vh;
             background: #62a2bf; color: #10242c;
             font: 15px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
      div { max-width: 44ch; padding: 2rem; }
      h1 { font-size: 1.1rem; margin: 0 0 1rem; }
      code { background: rgba(0,0,0,.14); padding: .1em .4em; border-radius: 3px; }
      p { margin: .6rem 0; }
      small { opacity: .75; }
    </style>
  </head>
  <body>
    <div>
      <h1>The game's dev server is not running</h1>
      <p>This frame proxies <code>/game/</code> to ${GAME_DEV_TARGET}, which is
         not answering.</p>
      <p>Start both servers with <code>npm run dev</code>, or start just the
         game with <code>npm run dev:game</code>, then reload.</p>
      <p><small>${error}</small></p>
    </div>
  </body>
</html>`

// https://vite.dev/config/
export default defineConfig({
  //assetsInclude: ['**/*.html'],
  plugins: [react()],
  server: {
    // The game is a separate Vite project embedded in an iframe at /game/.
    // A production build compiles it into public/game/, which this dev server
    // would otherwise serve as stale static files — so edits under game/src/
    // would never show up locally without a rebuild.
    //
    // Proxying to the game's own dev server serves it from source with hot
    // reload instead. `npm run dev` starts both.
    proxy: {
      '/game': {
        target: GAME_DEV_TARGET,
        changeOrigin: true,
        // Forward the hot-reload websocket as well.
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (error, _req, res) => {
            // On a websocket upgrade `res` is a raw socket, not a response.
            if (!res || typeof res.writeHead !== 'function') {
              res?.destroy?.()
              return
            }
            if (res.headersSent) return
            res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(proxyErrorPage(error.message))
          })
        },
      },
    },
  },
})
