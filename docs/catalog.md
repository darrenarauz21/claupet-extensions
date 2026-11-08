# Catalog format (`catalog.json`)

Same envelope as Claupet's revocation list: the payload is signed with ES256 (ECDSA P-256 + SHA-256)
using the official extensions key, and stored in base64 so the signed bytes are exact.

```json
{
  "payload": "<base64 of the payload JSON>",
  "keyId": "<SHA-256 of the public key, hex>",
  "signature": "<base64>"
}
```

Claupet reads it from
`https://raw.githubusercontent.com/darrenarauz21/claupet-extensions/main/catalog.json`
(at most once every 24 h, with ETag).

## Payload

```json
{
  "schema": 1,
  "sequence": 1,
  "generated": "2026-11-08T00:00:00Z",
  "extensions": [
    {
      "id": "claupet.example",
      "name": { "es": "Ejemplo", "en": "Example" },
      "description": { "es": "…", "en": "…" },
      "icon": "https://raw.githubusercontent.com/darrenarauz21/claupet-extensions/main/extensions/claupet.example/icon.png",
      "author": "Claupet",
      "license": "MIT",
      "version": "1.0.0",
      "claupet": ">=2.7.0",
      "provides": ["skill"],
      "permissions": ["pet"],
      "url": "https://github.com/darrenarauz21/claupet-extensions/releases/download/claupet.example-v1.0.0/claupet.example-1.0.0.claupet",
      "sha256": "<hex, lowercase>",
      "size": 12345,
      "keyId": "<key that signed the package>"
    }
  ],
  "revoked": {
    "keys": [],
    "extensions": { }
  }
}
```

## Rules the app applies

- The signature must match a key in `TrustStore.OfficialKeys`; otherwise the catalog is ignored.
- `sequence` must be greater than or equal to the last one seen: an older catalog is rejected
  (so nobody can serve an old one listing a vulnerable version).
- A download is installed only if its size and SHA-256 match the entry, and it still goes through the
  usual review (signer, permissions, runtime) before installing.
- `name`, `description`, `provides` and `permissions` are for display only; what is installed is what the
  package's own signed manifest says.
- `revoked` replaces the separate revocation list once the app reads the catalog.
