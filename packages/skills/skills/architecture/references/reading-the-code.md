# Reading the architecture from the code

What each part of the inventory looks like in a repository. Frameworks are examples; the stack profile from `standards_for_file` names the project's own.

## Parts

- `tracks` in `peer-ai.config.json` list the parts and where each lives. A track that's `external` lives in another repository: describe what it offers, not its insides.
- Inside a part, the top-level folders usually map to modules: one per area of the business, such as bookings or payments. A folder named for a technical layer, such as `utils` or `helpers`, often hides several owners.

## Dependencies

- Imports show which module depends on which. Look for the direction: a feature importing another feature, or business rules importing a framework, breaks ARC-06.
- A module reaching into another's internals, such as a private file or a table the other owns, breaks ARC-03.
- Two modules changing the same data means neither owns it (ARC-02). Find who writes to each table or store.

## Data

- Migrations, schema files and database clients show the stores and who reaches them. More than one way to reach the database, such as a raw client beside the managed one, breaks ARC-08.
- On a device: local databases, files and secure storage.

## Contracts

- API contract files, such as OpenAPI, GraphQL schemas or protocol buffers. Check whether clients use it or hand-write their own types (API-02).
- Events and messages between parts, and where their shapes are defined.

## Outside services

- Calls out to other companies' services, and the keys and settings they need.
- What each call sends, and whether anything happens when it fails.

## Where it runs

- Deployment files, pipelines, container files and infrastructure code.
- Environment settings: which environments exist, and whether production can be reached by hand (DEL-06).
