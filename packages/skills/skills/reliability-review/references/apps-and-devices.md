# Apps and the data they keep

REL-08, REL-09, FE-09, PERF-06 and PERF-07. Platforms are examples; the stack profile names the project's own.

## REL-08: the only copy is protected

- **Look at:** each `store` on a device that holds the only copy of a person's data.
- **Pass:** the app asks the platform to keep the data rather than clear it when space runs short, such as persistent storage in a browser, and offers a way to back it up or export it.
- **Fail:** data kept only in a browser's storage with no request to keep it, which the browser may clear.
- **Not applicable:** data that also lives on a server.

## REL-09: an app that caches itself still updates

- **Look at:** each service worker or app cache.
- **Pass:** the cache is versioned, the app checks for a new version, and applies it or tells the person.
- **Fail:** a cache that serves its first copy forever.

## FE-09: offline is a state, not an error

- **Look at:** each action a person can take in an app that works offline, per `project.traits`.
- **Pass:** with no connection, the app says so, keeps what the person did, and catches up when it's back.
- **Fail:** an action that fails with a generic error, or loses what was typed.

## PERF-06: screens release what they start

- **Look at:** each `resource`.
- **Pass:** cleared or ended when the screen goes away, such as in a clean-up function.
- **Fail:** a timer that keeps polling after the screen closes, running up requests and battery.

## PERF-07: photos are resized before they're kept

- **Look at:** each place photos are stored or uploaded.
- **Pass:** resized to what the product shows.
- **Fail:** full camera photos, which fill a device's storage quota and can lose the data REL-08 protects.
