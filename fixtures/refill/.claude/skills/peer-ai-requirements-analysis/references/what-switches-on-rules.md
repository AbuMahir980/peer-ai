# What switches on rules

Some facts about a product switch on rules that other products don't need. Find each one in the brief, the code or by asking, write it under "What it handles", and say what it adds to `peer-ai.config.json`. Offer the change; don't make it without asking.

## Traits

Each goes in `project.traits`.

| Trait | When the product | Look for |
|-------|------------------|----------|
| `money` | takes payments, holds balances, sets prices or pays people | a payment provider, prices, refunds, payouts, invoices |
| `safety-critical` | holds data where a mistake can hurt someone | allergens, medicines, doses, medical conditions |
| `several-audiences` | serves several apps, or several organisations, from one backend | a customer app and a staff app, businesses that each see only their own data |
| `offline` | must work without a connection | a service worker, data kept on the device |
| `real-time` | keeps live connections open | chat, live tracking, updates pushed as they happen |
| `uploads` | accepts files from people | photos, documents, attachments |
| `ai-features` | sends anything to an AI model | a model provider, an assistant, generated text or images |

## Personal data

List each kind the product keeps or sends on: names, contact details, addresses, location, photos of people, and anything about someone's health, beliefs, money or children. Say where each is kept and who it's sent to. This becomes the data inventory that privacy rules check against.

Health data, data about children and precise location carry extra duties in most laws. Name them when you find them.

## Where it operates

Each country or region where it has users goes in `compliance.jurisdictions`, as a code: `NG` for Nigeria, `GB` for the United Kingdom, `US-CA` for California, or `eu` for the European Union. The laws that follow are examples of what applies, such as Nigeria's NDPA or the EU's GDPR. Name them as questions for someone qualified to confirm, never as legal conclusions.

## Industries

An industry with its own rules goes in `compliance.industries`, such as `payments`, `health` or `food`. Card payments bring the card industry's standard, PCI DSS, even when a payment provider handles the cards.
