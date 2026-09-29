# Modelling, done well

Examples from a made-up bicycle repair booking service.

## Let the database guarantee it (SYS-05)

- **Badly:** the code checks a slot is free before booking it.
- **Well:** `UNIQUE (shop_id, slot_starts_at)` on bookings. Two cyclists can't book the same slot, whatever the code does.

Other guarantees worth the database's help:

- `NOT NULL` for what must always be there;
- a foreign key for every link, with what happens on delete;
- `CHECK (deposit_amount >= 0)` for amounts that can't be negative;
- a fixed list of allowed values for a status, such as an enum or a check.

## Money (MONEY-01, MONEY-02, MONEY-06, MONEY-12)

- **Badly:** `deposit NUMERIC(8,2)`, and a copy of it on the shop's report table.
- **Well:** `deposit_amount INTEGER NOT NULL CHECK (deposit_amount >= 0)`, in the currency's smallest unit, and `currency CHAR(3) NOT NULL`, on the booking only. A refund is its own record with its direction, never a negative deposit.
- A payment keeps the provider's reference, never the card number or security code.

## Safety-critical data (SAFE-02, SAFE-03)

- **Badly:** `has_carbon_frame BOOLEAN`, where "don't know" becomes false.
- **Well:** `frame_material` from a fixed list, with `unknown` as a value of its own.

## Personal data (PRIV-03, PRIV-06)

| Field | Why it's needed | Kept for |
|-------|-----------------|----------|
| cyclists.phone | To say the bike is ready | Until the account closes, then deleted |
| bookings.damage_photos | For the mechanic to quote | 90 days after the repair, then the files are deleted |

A field with no reason to be kept is a field to remove.

## A change that loses nothing (DATA-03)

To split `name` into `first_name` and `last_name`:

1. Add both columns, allowing empty values.
2. Copy `name` across, and keep writing all three.
3. Switch every read to the new columns.
4. In a later release, after checking nothing reads it, drop `name`.

Dropping or renaming in one step loses data, or breaks code still running the old version.

## On a device

Data kept on a device follows the same rule: each app update keeps what's already there (DATA-03).
