# Architecture

A dependency-free CommonJS Node app. `src/sessionDetails.js` owns shared display
formatting, `src/views.js` renders escaped HTML for the Dashboard and Sessions
page, and `server.js` serves those views with local sample data. No backend or
authentication is required. Start with `npm start`; it prints its local URL
using an available port (or an explicitly supplied PORT).
