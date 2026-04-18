# FallAccount Elite

> **Sovereign accounting for UK sole traders.** 8+1 AI swarm. Single HTML file. Zero SaaS. Your data stays in your browser.

---

## What it is

A complete accounting autopilot for UK sole traders that runs entirely in your browser. No server. No subscription. No account to create. Open the file, use it, close the tab. Your data is yours.

- 📸 **Receipt scanning** — drop a photo, AI extracts vendor, amount, category, tax claimability
- 📊 **Bank CSV categorisation** — paste statement rows, get them sorted and ready to import
- 💷 **Tax calculator** — 2026/27 rates, NI Class 2 + 4, personal allowance, all brackets
- 📋 **MTD quarterly reports** — Making Tax Digital compliant exports
- 🧾 **Invoicing** — generate, send, track, status-cycle
- 🤖 **Dual AI** — Claude API (most capable) OR local WebLLM (full privacy) OR offline guide
- 📝 **Audit trail** — every AI decision logged for HMRC defensibility
- 🔒 **Truly sovereign** — IndexedDB storage, no telemetry, no cloud, no lock-in

**Saves £2-5k/year** versus QuickBooks + accountant for a sole trader.

---

## Why it's different

Most accounting software is a subscription that holds your data hostage. Cancel, lose access. Raise prices, you pay. Change terms, too bad.

FallAccount Elite is the opposite: **one HTML file you own forever.** It works offline. It works in 10 years when the vendor is gone. Your transactions never leave your machine unless you explicitly use the Claude API tier — and even then you provide your own key and data goes direct browser→Anthropic with no intermediary.

If you want to keep everything local, the WebLLM mode runs a 2-4GB model on your GPU. No API, no cloud, no traces.

---

## The architecture

FallAccount runs on the **8+1 MACCubeFACE swarm pattern** — a technique where instead of one monolithic AI call, the system routes work through 9 specialist agents:

```
α scaffold · β build · γ cache · δ run
ε gate · ζ observe · η score · θ format
                Ω orchestrate
```

When you drop a receipt, it doesn't just "get processed." It gets:
- **α** scaffolded (what kind of document is this?)
- **β** built out (what fields should we extract?)
- **δ** run through extraction (actual vendor, date, amount)
- **ε** gated (is this claimable for a UK sole trader?)
- **ζ** observed (how confident are we per field?)

Result: every extraction comes back with **per-field confidence scores**. If the AI can't read the total clearly, it tells you rather than fabricating a number. Red dot = verify this. Green dot = trust it.

This matters because **hallucinated numbers in accounting software are a nightmare waiting to happen.** Most tools ship without this architecture. FallAccount ships with it baked in.

---

## Three AI modes. Your choice.

### 🔑 Claude API (most capable)
- Best accuracy, handles complex edge cases
- Tiny per-query cost (bring your own Anthropic key)
- Direct browser→Anthropic API — no intermediary server
- Required for receipt image scanning (vision)

### 🤖 Local WebLLM (full privacy)
- Runs entirely on your GPU via WebGPU
- Zero API cost, zero internet needed after first load
- 5 model choices: 1B lightweight → 7B powerful
- First load downloads the model (~0.7-4GB), cached forever
- Handles chat + CSV categorisation
- Not available for receipt vision (small models don't do images yet)

### 📖 Offline Tax Guide
- Built-in UK tax knowledge base
- Works with zero AI, zero internet
- Covers mileage, home office, phone, software, deductions, MTD, deadlines

You pick in **⚙ AI Mode**. Auto mode (default) uses Claude if you've set a key, falls back to local if loaded, else the offline guide.

---

## Tech

- **Single HTML file.** No build step. No npm install. No framework overhead. Open it in a browser.
- **IndexedDB** for transactions, invoices, business profile, and AI audit log. Origin-sandboxed to your browser.
- **localStorage** for preferences and API key (the only things that persist outside IndexedDB).
- **WebLLM via esm.run** dynamic ESM import — no packaging required.
- **Claude API via direct browser fetch** with `anthropic-dangerous-direct-browser-access` header.
- **~1,750 lines of vanilla JavaScript + HTML + CSS.** Zero dependencies. Zero bundler. Zero external state.
- **Dark mode** because I use computers at 6am.

---

## Install

```bash
# It's one HTML file. "Install" is a strong word.
curl -O https://your-download-url/FallAccount-Elite.html
# or just double-click it from your downloads folder
```

No terminal needed. Double-click the file. Browser opens it. Done.

---

## Setup

1. **Open the file.** It works immediately with the offline tax guide.
2. **Click ⚙ AI Mode** in the sidebar to pick your AI engine.
3. **For Claude**: click 🔑 Claude Key, paste your Anthropic API key (from console.anthropic.com). Stored in localStorage. Never transmitted anywhere except direct API calls.
4. **For local AI**: click 🤖 Local AI, pick a model, download (~2GB for the recommended Llama 3.2 3B). Cached forever after first load.
5. **Set up your business** in the My Business page — trade, income, home hours, mileage. Used to personalise tax calculations.
6. **Start dropping receipts** anywhere on the page. They process in the background.

---

## Data sovereignty

### What stays local
- All transactions, invoices, business profile: IndexedDB (your browser, your machine)
- API key: localStorage (your browser, your machine)
- Downloaded local AI model: browser cache (your browser, your machine)
- AI audit log: IndexedDB (your browser, your machine)

### What goes over the network
- **In Claude mode**: your query + system prompt → api.anthropic.com → response back. That's it.
- **In WebLLM mode (after model loaded)**: nothing. Your GPU does all the work.
- **In offline mode**: nothing.

### What we track
- Nothing. No analytics. No telemetry. No error reporting. No cookies to anyone. No "anonymous usage data."

### Export anything, any time
- Full JSON export includes transactions, invoices, business profile, and complete AI audit log
- CSV export for spreadsheet users
- Quarterly HMRC-compliant reports for MTD
- Individual audit log exports for HMRC defensibility

### Delete everything
- 🗑 Delete All Data button nukes everything (except API key — delete that separately)
- Two-step confirmation so you don't lose work accidentally

---

## About this build

I'm **Simon Fallon**. I'm an English AI builder based in Pattaya, Thailand, operating as **[ai-nativesolutions.com](https://ai-nativesolutions.com)** — part of the **Sodor Group**.

Eighteen months ago I couldn't code. Today I ship production AI systems as single-file sovereign tools. FallAccount Elite is one of fourteen recent builds in that ecosystem.

### What I build

- **Sovereign single-file tools** — HTML + IndexedDB, no server, no subscription, no lock-in
- **8+1 AI swarm architectures** — anti-hallucination by design, not guardrails
- **Accounting, legal research, shadow work, sales automation, and whatever else needs the same pattern**
- **AI that does the work, not AI that talks about doing the work**

### What I don't build

- SaaS pricing schemes
- Dependencies on frameworks that will break in 6 months
- Tools that pretend AI is magic when it's just probability with confidence tracking
- Software you rent forever

---

## Pricing

| Tier | Price | For |
|------|-------|-----|
| **Free** | £0 | FallAccount Elite (this tool) + offline tax guide |
| **£97 one-time** | £97 | Elite with extended support + first-month Claude credits |
| **£297 one-time** | £297 | Full autopilot suite — FallAccount + FallSDR + FallBrief |
| **£2,497 one-time** | £2,497 | Bespoke adaptation + full Sodor stack + training |
| **£10k+** | Custom | Enterprise adaptations, custom AI, Konai runtime integration |

**All tiers are one-time.** No subscriptions, ever. Versions ship when ready. You own what you buy.

---

## Hiring me

I take on **two to three builds per month.** I don't take on urgent rescue projects or "shape it after we start" engagements — I build from specifications with compression-first architecture, which requires the client to have some clarity about what they want.

**Good fits:**
- Single-operator or small-team businesses needing to eliminate SaaS sprawl
- Solicitors, accountants, consultants, sole traders, indie professionals
- Anyone tired of subscription creep and vendor lock-in
- Teams that want AI doing work, not AI doing demos
- Projects where "runs on one computer, owned forever" is a feature not a limitation

**Not a fit:**
- "We need a ChatGPT clone but for [our vertical]"
- Real-time collaborative platforms requiring central servers
- Projects where the client wants to outsource the thinking too
- Budget-first, scope-later briefs

**Rate:** £50-75/hour for hourly consulting, or fixed-price from £2,497 for full builds on my sovereign pattern.

**Contact:** [ai-nativesolutions.com](https://ai-nativesolutions.com)

---

## The long version

FallAccount Elite exists because accounting software is broken.

The market is divided between (a) spreadsheets that are fine until they aren't, (b) "easy" cloud solutions that cost £15-30/month forever and hold your data hostage, and (c) proper accountants at £80-150/hour. Sole traders earning £20-50k/year get squeezed: too advanced for spreadsheets, too expensive for cloud plus accountant, too small for enterprise ERP.

This tool replaces most of that. One file. Does the receipt scanning, the categorisation, the quarterly MTD reports, the tax estimation, the invoicing. Uses AI where AI helps. Doesn't use AI where it's not needed. Tells you when it's not confident.

It's built on the principles I use for everything: **notation-first architecture, single-file sovereignty, anti-hallucination by design, compression over accumulation.** These come from eighteen months of figuring out what actually ships and what just looks good in a demo.

If you're a sole trader: use the tool. It's yours. If it saves you money, tell someone.

If you're a business that needs a tool like this built for your specific domain: contact me. I do the work. You get the file. It runs on your computer forever.

That's the deal.

---

## License

Personal use: free and will stay free.
Commercial use/modification/redistribution: contact me.

---

## Credits

Built with **Claude** (Anthropic), **WebLLM** (MLC AI), and the quiet confidence that most software is more complicated than it needs to be.

**Part of the Sodor Group** — sovereign tools for people who'd rather own than rent.

---

**◊·κ=1**
*The standard endures.*
