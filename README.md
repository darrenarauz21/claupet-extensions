# Claupet Extensions

The official extensions for [Claupet](https://github.com/darrenarauz21/claupet), and the signed catalog
the app's **Extensions** view reads to list, install and update them.

[Español](README.es.md)

## Layout

```
extensions/<id>/        source of each extension (manifest.json + its files)
catalog.json            signed catalog (generated, never edited by hand)
docs/catalog.md         catalog format
```

Each version is published as a GitHub Release with the tag `<id>-v<version>` and one asset,
`<id>-<version>.claupet`, signed with the official Claupet extensions key.

## Publishing a version

1. Bump `version` in `extensions/<id>/manifest.json`.
2. Pack and sign it **locally** (the private key never goes to GitHub):
   `Claupet.exe --extension-pack extensions/<id> out/<id>-<version>.claupet --clave ~/.claupet-firma/claupet-extensiones.pem --firmante Claupet`
3. Create the Release `<id>-v<version>` with that file.
4. Regenerate and sign `catalog.json` with `--extension-catalog` (see [docs/catalog.md](docs/catalog.md)), then commit it.

Claupet only trusts what the catalog lists if its signature matches the official key built into the app,
and only installs a package whose SHA-256 matches the catalog.

## Writing an extension

See the [extensions guide](https://github.com/darrenarauz21/claupet/blob/main/docs/extensiones/README.md)
in the Claupet repository.

## License

Each extension declares its own license in its manifest.
