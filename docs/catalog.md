# Catalog format (`catalog.json`)

Same envelope as Claupet's revocation list: the payload is signed with ES256 (ECDSA P-256 + SHA-256)
using the official extensions key (keyId `2F0A 01CF 1379 7CF2`), and stored in base64 so the signed bytes
are exact.

```json
{
  "payload": "<base64 of the payload JSON>",
  "keyId": "2f0a01cf13797cf2a233c84187b864a39514c031cca91d87c85350133341c410",
  "signature": "<base64>"
}
```

Claupet reads it from
`https://raw.githubusercontent.com/darrenarauz21/claupet-extensions/main/catalog.json`
(at most once every 24 h, with ETag) and keeps the last good one for when there is no network.

## Payload

```json
{
  "schema": 1,
  "sequence": 1,
  "generated": "2026-11-08T00:00:00Z",
  "keys": [],
  "extensions": { },
  "packages": [
    {
      "id": "claupet.example",
      "version": "1.0.0",
      "name": { "es": "Ejemplo", "en": "Example" },
      "description": { "es": "…", "en": "…" },
      "icon": "https://raw.githubusercontent.com/darrenarauz21/claupet-extensions/main/extensions/claupet.example/icon.png",
      "author": "Claupet",
      "license": "MIT",
      "minClaupet": "2.7.0",
      "provides": ["skill"],
      "permissions": ["pet"],
      "url": "https://github.com/darrenarauz21/claupet-extensions/releases/download/claupet.example-v1.0.0/claupet.example-1.0.0.claupet",
      "sha256": "<hex, lowercase>",
      "size": 12345,
      "keyId": "<key that signed the package>"
    }
  ]
}
```

`keys` and `extensions` are the revocations, with the same meaning as Claupet's revocation list:
revoked key ids, and `"<id>": "<version>"` to revoke that version and every older one.

Everything in an entry comes from the package itself (its signed manifest, its hash and size). `icon`
is only set when the package contains an `icon.png`, which must also be in `extensions/<id>/icon.png`.

## Generating it

Never edit `catalog.json` by hand. Rebuild it from **every** published package (the latest version of
each), with a `sequence` one higher than the current one:

```
Claupet.exe --extension-catalog ~/.claupet-firma/claupet-extensiones.pem <sequence> catalog.json \
    out/claupet.a-1.2.0.claupet out/claupet.b-0.3.1.claupet \
    [--clave-revocada <keyId>]… [--version-revocada <id>=<version>]…
```

## Rules the app applies

- The signature must match a key in `TrustStore.OfficialKeys`; otherwise the catalog is ignored.
- `sequence` must be greater than or equal to the last one seen: an older catalog is rejected
  (so nobody can serve an old one listing a vulnerable version).
- A download is installed only if its size and SHA-256 match the entry, and it still goes through the
  usual review (signer, permissions, runtime) before installing.
- `name`, `description`, `provides` and `permissions` are for display only; what is installed is what the
  package's own signed manifest says.
- Entries that do not validate (bad id, non-https url, bad hash…) are skipped, not the whole catalog.
