# Containing an incident

Examples are from a made-up bicycle repair booking service. Each move stops harm at a cost; choose the smallest that works now, and say what it costs.

| Move | Stops | Costs | Works when |
|------|-------|-------|------------|
| Undo the release | Whatever the release broke | The release's other changes, for now | The previous version still runs on the data as it is now (OPS-14) |
| Switch the feature off | The harm from one feature | That feature, for everyone | The feature can be switched off without a release |
| Block one path | Abuse through one route, account or address | That path, for everyone using it | The abuse comes through something you can close |
| Take the service down | Everything | Everything | Nothing smaller stops ongoing harm to people's data or money |
| Replace a secret | Use of a secret that leaked | A short outage for whatever uses it | The secret can be replaced quickly (SEC-26) |

## Before any move

- Keep the evidence: copy the logs and the affected records before changing anything.
- Check the move itself won't cause harm, such as undoing a release whose data change the old version can't read.

## After the move

- Check the harm has stopped, from the same signal that showed it, such as the error rate, or a report that can't be reproduced any more.
- Write down when the move was made, and when it will be undone.

## Apps on people's devices

An app already installed can't be taken back. Stop the harm on the server where you can, stop the release reaching more people, and ship a fix as fast as the stores allow. If the app can require an update (MOB-06), use it once the fix is out.
