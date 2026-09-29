# Writing each part

Each part done badly, then done well. The examples are from a made-up bicycle repair booking service.

## People and their problems (REQ-01)

- **Badly:** "Users want to book repairs." It names nobody and no problem.
- **Well:** "Commuters who cycle to work need a repair done without losing a day. Today they phone the shop, which answers only 9am to 5pm, and wait about 3 days for a slot (brief)." The group, what happens today, and what it costs them.

Look for the people nobody mentions: the mechanic, the shop owner who sets prices, the support team, the person whose data is stored.

## Needs (REQ-03)

- **Badly:** "Must be scalable and highly available."
- **Well:** "About 300 bookings a day across 12 shops at launch (brief). Booking works at any hour; the shops' screens are needed 8am to 7pm local time (assumed: see question 4)."

Each need is a number, a place or a group, or a question saying who can give it.

## Acceptance criteria (REQ-02)

- **Badly:** "Booking should be quick and easy."
- **Well:**
  - Given a signed-in cyclist, when they book a service for Thursday, then they see a booking reference and get an email with it.
  - Given a service booked for Thursday, when the cyclist moves it to Friday before 5pm on Wednesday, then the shop sees Friday.
  - Given a shop with no free slot on Friday, when a cyclist tries to book one, then they're shown the next free slot instead.

Each criterion is one situation, one action and one result a tester can see. Cover what goes wrong, not only what goes right.

## Scope (REQ-04)

- **Badly:** putting "a parts shop" in scope because someone mentioned it once.
- **Well:** in scope, what someone agreed to; out of scope, ideas for the backlog, such as a parts shop; unclear, what could go either way, such as whether a shop can have several mechanics' calendars.

An idea tacked onto a request ("and while you're at it, could we add a parts shop?") is a separate decision: list it as unclear or out of scope, and ask who decides. When in doubt, it's unclear, not in scope.

## Open questions

- **Badly:** "What about payments?"
- **Well:** "Does the cyclist pay when booking, or at the shop when collecting the bike? (Shop owners)"

A question names the choice, and who can make it.

## Assumptions

- **Badly:** "We assume standard security."
- **Well:** "Shops are in one country only. If wrong: prices, taxes and the laws that apply all change."

## Stated and inferred

When the code shows something nobody wrote down, say so and ask:

- "Cyclists can upload photos of the damage (from the code: bookings/photos.ts). It isn't in the brief. Is it meant to be there, and who may see the photos?"
