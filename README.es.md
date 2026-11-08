# Extensiones de Claupet

Las extensiones oficiales de [Claupet](https://github.com/darrenarauz21/claupet) y el catálogo firmado
que la vista **Extensiones** de la app lee para listarlas, instalarlas y actualizarlas.

[English](README.md)

## Estructura

```
extensions/<id>/        el código de cada extensión (manifest.json y sus archivos)
catalog.json            el catálogo firmado (se genera, nunca se edita a mano)
docs/catalog.md         el formato del catálogo
```

Cada versión se publica como una Release de GitHub con el tag `<id>-v<versión>` y un solo archivo,
`<id>-<versión>.claupet`, firmado con la clave oficial de extensiones de Claupet.

## Publicar una versión

1. Subir `version` en `extensions/<id>/manifest.json`.
2. Empaquetar y firmar **en el equipo** (la clave privada nunca va a GitHub):
   `Claupet.exe --extension-pack extensions/<id> out/<id>-<versión>.claupet --clave ~/.claupet-firma/claupet-extensiones.pem --firmante Claupet`
3. Crear la Release `<id>-v<versión>` con ese archivo.
4. Volver a generar y firmar `catalog.json` con `--extension-catalog` (ver [docs/catalog.md](docs/catalog.md)), y hacer commit.

Claupet solo confía en lo que lista el catálogo si su firma corresponde a la clave oficial que trae la
app, y solo instala un paquete cuyo SHA-256 coincide con el del catálogo.

## Escribir una extensión

Ver la [guía de extensiones](https://github.com/darrenarauz21/claupet/blob/main/docs/extensiones/README.md)
en el repositorio de Claupet.

## Licencia

Cada extensión declara su licencia en su manifiesto.
