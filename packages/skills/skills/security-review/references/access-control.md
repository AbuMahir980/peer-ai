# Who may do what

SEC-01 to SEC-04, SEC-14 and SEC-21.

## SEC-01: the record, not only the role

For every item that takes an id, whether in the path, the query, the body or a GraphQL argument:

1. Find where the record is loaded.
2. **Pass** when the load, or a check straight after it, ties the record to the caller: by owner, by tenant or by an explicit grant. The evidence names each id the item takes and the line that ties it to the caller. Recording who made a request doesn't check the records it names.
3. **Fail** when the record is loaded by its id alone, then returned or changed, or never loaded at all before it's used.

Look closely at:

- a child reached through its parent, such as `/orders/{id}/items/{itemId}`, where the item must belong to that order;
- a check on read that's missing on update or delete;
- lists and exports filtered by an owner id the client sends;
- bulk actions, which must check every record;
- the fields returned: a caller allowed to see a record may not be allowed all of it. A public page, such as a repair's status link, shows only what anyone may see, never a person's contact details.

Not a finding: a record the product means to be public. Say so in the evidence, with the fields it returns.

## SEC-02: each action checks its role

- **Pass** when each action names the role it needs, and powerful actions (releasing money, changing roles, deleting accounts) need a specific role, not any staff role.
- **Fail** when an admin action checks only that the caller is signed in, or when every staff role can do everything.

## SEC-03: on the server, on every request

**Fail** when permission comes from anything the client can change:

- a role in the request body;
- a hidden field;
- an unsigned cookie;
- a token whose signature or expiry isn't verified;
- the app's own state.

**Fail** too when one request's check is trusted on the next, such as a "verified" flag in the session that a skipped step would have set.

A token's claims count only when the server verifies them, with the signing algorithm fixed on the server.

## SEC-04: one app per session (projects with several audiences)

**Pass** when each session is issued for one app or tenant and refused by the others, and the client says which it is signing in to.

**Fail** when:

- a staff token works on the customer API;
- a tenant is taken from the request with no check that the session belongs to it;
- the server picks an app by guessing.

## SEC-14: sessions end

A pass needs evidence of all four:

- an idle timeout;
- a maximum lifetime;
- signing out that ends the session on the server;
- disabling an account ending all of its sessions.

**Fail** on:

- tokens with no expiry;
- signing out that only deletes the token on the device;
- a stateless token that can't be revoked and lives longer than a short access window, with no revocable refresh behind it.

## SEC-21: every live event (projects with live connections)

**Pass** when permission is checked for each event sent, and events go only to the people they're for, such as a room or channel per record that checks access on joining.

**Fail** when:

- permission is checked only when connecting;
- events are broadcast to everyone connected;
- a client can subscribe to any channel by name.
