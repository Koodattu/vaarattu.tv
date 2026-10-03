# vaarattu.tv frontend

Next.js 16 / React 19 interface for viewer profiles, leaderboards and stream recordings.

Use the [isolated local setup and testing guide](../docs/local-testing.md) to run
against synthetic data without starting Twitch collection or using live credentials.
The fixture API listens on 33101 and the local frontend on 33102.

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:33101'
npm.cmd run dev -- --hostname 127.0.0.1 --port 33102
```

`NEXT_PUBLIC_API_BASE_URL` is compiled into the client bundle. When omitted, API
requests use the current origin, as expected by the existing production proxy.

Checks:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:e2e
npm.cmd run build
```

Browser tests require the disposable PostgreSQL setup in the linked guide; they
start their own synthetic API and frontend. A production build needs access to
Google Fonts for the existing Geist configuration. Stop the dev server before
building. The linked guide includes the standalone-server command and asset
copies matching the existing Dockerfile.
