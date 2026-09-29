# Writing each part

Each part done well, from a made-up bicycle repair booking service: moving a booking to another day.

## Who can do what

| Role | Can | Can't |
|------|-----|-------|
| Cyclist, signed in | Move their own booking, up to 5pm the day before | See or move anyone else's booking |
| Mechanic | Move any booking at their own shop, at any time | Move bookings at other shops |

Name the records, not only the actions: "their own booking", "at their own shop".

## Journeys

1. The cyclist opens their booking and chooses "Move".
2. They see the next 14 days, with full days marked full in words, not only in grey.
3. They pick a day and confirm.
4. The booking shows the new day, and they get an email.

Then the ones that go wrong: the day fills up while they're choosing; it's past 5pm the day before; the network drops as they confirm.

## Screens and their states

- **Loading:** the booking's details stay on screen while the free days load.
- **Empty:** no free day in the next 14: say so, and offer the shop's phone number.
- **Error:** "We couldn't move your booking. It's still on Thursday. Try again." Say what happened and what to do next.
- **Offline:** the Move button says it needs a connection, rather than failing after a tap.

## Acceptance criteria

- Given a booking for Thursday, when the cyclist moves it to Friday before 5pm on Wednesday, then the booking shows Friday and the shop sees Friday.
- Given it's 5:01pm on Wednesday, when the cyclist tries to move Thursday's booking, then they're told changes closed at 5pm and given the shop's number.
- Given Friday's last slot is taken while the cyclist is choosing, when they confirm Friday, then the booking stays on Thursday and they're shown Friday is now full.

## Edge cases

- The cut-off is 5pm in the shop's time zone, not the cyclist's or the server's.
- On the day the clocks change, 5pm still means 5pm local time.
- Moving a booking to the day it's already on changes nothing and sends no email.

## Proposed behaviour

When the requirements don't say, write what you recommend and mark it: "Proposed: a cyclist can move a booking at most twice. Waiting for the shop owners."
