# Topline Intake

Startup intake and deal-dossier tool for **Topline Ventures**. Each company gets a dossier
(overview, team, product, market, traction, cap table & round, competition, thesis & risks,
scoring & DD, documents, notes & calls) that fills up over time from the **Notion Deal Flow**
database and from what you learn talking to founders. A dashboard summarises the pipeline.

> This is the **sample** version: it ships with one fully filled-in fictional company
> (Kestrel Labs) and seven lighter fictional deals. Nothing in the sample data is real.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Data is stored in the browser (localStorage) for now. **Reset sample data** on the Companies page restores the seed.

## Connect Notion (no AI, no inference cost)

The sync uses the **Notion public API**, which is free. Every Deal Flow property maps onto a dossier field, so no LLM is involved.

1. Go to <https://www.notion.so/profile/integrations> → **New integration** (internal) → copy the secret.
2. In Notion open **Topline Ventures › Operating Hub › Database › Deal Flow** → `•••` → **Connections** → add the integration.
3. Create `.env.local`:
   ```bash
   NOTION_TOKEN=secret_xxx
   NOTION_DEALFLOW_DB=262bb3a481938306850e8116a9ce6591
   ```
4. Restart `npm run dev` and open **Notion sync**. Import a row to create a dossier; use **Sync** to refresh it.

Without a token the Notion sync page runs in **demo mode** with fictional rows, so the flow can still be tried.

The token stays on the server (`app/api/notion/*`). It is never sent to the browser.

### Field mapping

| Notion (Deal Flow) | Dossier |
|---|---|
| Firm | Company name |
| Stage, Industry | Stage, Sectors |
| Deal Status | Status (“To be reviwed” is normalised) |
| Raising / Raised | Round size / Raised to date |
| Valuation | Pre-money (marked *reported*) |
| Round Info | Instrument + round notes |
| Website, Headquarter, Drive | Website, HQ, Documents |
| Last Contact | Last contact (most recent date wins) |
| Score | Notion score (shown next to the dossier’s own weighted score) |
| Notes + page body | One timeline entry, refreshed on each sync |

**Merge rule:** Notion fills empty fields and refreshes the fields it owns. It never overwrites
a value captured on a founder call, from a deck, or edited by hand. Each field shows its source
(Notion / Founder call / Deck / Research / Manual) and how reliable it is (confirmed / reported / estimated).

## Enriching from founder calls

On a dossier, **Notes & calls → Log call / note** records the conversation in the timeline. Any
numbers you heard (ARR, customers, burn, round size, pre-money, lead…) update the dossier
directly, tagged *Founder call*. **Prep for next call** lists the open questions and the
questions that would fill the dossier’s empty fields.

### When would AI (and inference cost) be needed?

Only to turn **unstructured text** (call transcripts, pitch decks, long Notion notes) into
structured fields automatically, for example to pull the cap table or TAM out of a deck. That is an
optional next step (one API call per document). Everything above works without it.

## Deploy

Works as-is on Vercel (free tier): import the repo and set `NOTION_TOKEN` and `NOTION_DEALFLOW_DB` as environment variables.

## Next steps

- Shared database (Supabase/Postgres) instead of localStorage, so the whole team sees the same dossiers. Only `lib/store.tsx` changes.
- Write-back to Notion (status, score, last contact).
- Optional AI extraction from decks and transcripts.
- Login for the team.

## Structure

```
app/
  page.tsx                 Dashboard
  companies/page.tsx       Company list + new dossier
  companies/[id]/page.tsx  Dossier (all sections)
  import/page.tsx          Notion sync
  api/notion/deals/        Server routes that read the Deal Flow DB
components/                Charts, dossier field/list editors, UI bits
lib/
  types.ts                 Data model
  model.ts                 Defaults, scoring, completeness, helpers
  notion.ts                Notion API client (server only)
  notion-map.ts            Notion row → dossier merge
  sample.ts                Fictional sample companies
  store.tsx                Client store (localStorage)
```
