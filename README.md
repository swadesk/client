# NamasQr

**Tradition meets technology** — QR ordering and restaurant operations for modern Indian hospitality.

- **Logo**: source `assets/branding/namasqr-logo.svg` (imported via `@assets/*` in `BrandLogo`; mirrored in `public/branding/` for static fallback).
- **Currency**: ₹ via `en-IN`; amounts use **paise** (`priceCents` fields).
- **Multi-tenant**: Data scoped by `restaurantId` from the NamasQR API.

## Documentation

- [Application state & architecture](docs/APP_STATE.md) — features, env, gaps, roadmap ideas  
- [Component organization](docs/COMPONENTS.md) — `components/ui`, `shared`, `layout`, `features`

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — dev server  
- `npm run build` — production build  
- `npm run lint` — ESLint  
