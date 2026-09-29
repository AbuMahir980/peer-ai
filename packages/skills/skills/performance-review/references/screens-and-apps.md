# Screens and apps

PERF-05 to PERF-07 and REL-09. Frameworks are examples; the stack profile names the project's own.

## PERF-05: long lists draw what's on screen

- **Look at:** each `screen-list` that can grow with use.
- **Pass:** a virtualised list, such as a list component that renders only visible rows, or pages loaded as the person scrolls.
- **Fail:** every row mapped into a plain scrolling container. It's fine for a list that can't grow, such as the days of a week: say why.

## PERF-06: resources are released

- **Look at:** each `resource`.
- **Pass:** each timer cleared, subscription ended, listener removed and object URL revoked when the screen or component goes away, such as in an effect's clean-up function.
- **Fail:** an interval that keeps polling after the screen closes; an object URL made on every render and never revoked.

## PERF-07: images are resized before they're kept

- **Look at:** each `image`.
- **Pass:** photos resized to the largest size the product shows before they're stored or uploaded.
- **Fail:** full camera photos stored as they are, filling storage and slowing every screen that shows them.

## REL-09: an app that caches itself still updates

- **Look at:** each service worker or app cache.
- **Pass:** new versions reach people: the cache is versioned, and the app fetches a fresh copy when one is published, then tells the person or reloads.
- **Fail:** a cache that always serves its first copy, so nobody gets an update.
