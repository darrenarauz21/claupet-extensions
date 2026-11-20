<div align="center">

<img src="https://raw.githubusercontent.com/darrenarauz21/claupet/main/docs/capturas/mascotas.png" alt="Las mascotas de Claupet bailando juntas" width="560">

# Extensiones de Claupet

**Mascotas, voces, sonidos, habilidades y herramientas nuevas para sus agentes de código. Firmadas, verificadas y a un clic.**

[English](README.md) · **Español**

![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-D97757)
![Firmadas](https://img.shields.io/badge/paquetes-firmados%20ES256-2A1F1A)
![Catálogo](https://img.shields.io/badge/catálogo-verificado-6DB283)
![Cualquier lenguaje](https://img.shields.io/badge/escríbalas%20en-cualquier%20lenguaje-8B5CF6)

[Qué agregan](#qué-agregan) · [Instalar una](#instalar-una) · [Seguras por diseño](#seguras-por-diseño) · [Haga la suya](#haga-la-suya) · [Consiga Claupet](https://github.com/darrenarauz21/claupet)

</div>

---

[Claupet](https://github.com/darrenarauz21/claupet) le muestra su uso, las sesiones de sus agentes de código y una
mascota de escritorio, junto al reloj. Las extensiones lo hacen suyo: un personaje nuevo, otra voz, el modelo que
prefiera para el asistente o herramientas de más para Claude Code, Codex, Gemini, Copilot y OpenCode. Este
repositorio es su casa oficial, y el catálogo firmado que Claupet lee para listarlas, instalarlas y actualizarlas.

## Qué agregan

- 🐾 **Mascotas.** Un personaje entero en su escritorio, con sus propias animaciones, en lugar del chibi.
- 🗣️ **Voces y habla.** Voces y estilos de voz nuevos para Claupet, o su propio motor de voz a texto.
- 🔊 **Paquetes de sonidos.** Un sonido distinto para cada aviso: terminó, le espera, pide permiso, límites.
- 🧠 **Asistentes.** Respuestas de la mascota y la isla con el modelo que prefiera: DeepSeek, Ollama, LM Studio,
  OpenRouter, Groq o cualquier servidor compatible con OpenAI.
- 🧩 **Habilidades.** Sus propios `/comandos` en el chat de Claupet, y código que reacciona a los avisos, las
  sesiones, el uso de herramientas o los archivos que suelte en la mascota. La mascota puede hablar, animarse y
  mostrar tarjetas en la isla por usted.
- 🛠️ **Herramientas para sus agentes de código.** Servidores MCP que reciben a la vez todas las sesiones de Claupet
  Terminal, sea cual sea el agente: Claude Code, Codex, Gemini CLI, Copilot CLI u OpenCode.
- 🧑‍🔬 **Especialistas** *(experimental)*. Agentes listos, con su rol, sus instrucciones y sus herramientas, a los
  que sus sesiones pueden delegarles trabajo.

## Instalar una

Abra **Claupet Console › Ajustes › Extensiones**. El catálogo muestra cada extensión oficial con lo que trae;
**Instalar** la baja, la comprueba y la enciende. Cuando hay una versión nueva, **Actualizar** aparece ahí mismo, y
cada extensión tiene su página para apagarla, revisar sus permisos y ajustes, o desinstalarla. ¿Tiene un archivo
`.claupet` de otro lado? Suéltelo sobre la mascota o use **Instalar desde archivo…**.

> [!NOTE]
> Por ahora, las extensiones funcionan en **Windows**. El catálogo es nuevo: las primeras extensiones oficiales
> vienen en camino.

## Seguras por diseño

- ✍️ **Paquetes firmados.** Cada `.claupet` va firmado (ES256). Claupet muestra quién lo firmó, y una extensión
  oficial lleva la clave oficial de Claupet, que viene dentro de la app.
- 📜 **Un catálogo firmado.** Claupet solo confía en el catálogo si su firma coincide con esa clave, nunca vuelve a
  uno más viejo y solo instala un paquete cuyo tamaño y SHA-256 coinciden con lo que dice el catálogo.
- 🔐 **Usted decide qué puede hacer.** Cada extensión pide las capacidades que necesita (hablar por la mascota, los
  avisos, el micrófono, usar Claude con su plan…) y usted las aprueba. Las claves quedan cifradas en su equipo.
- 🧱 **Aparte.** Las extensiones corren en su propio proceso, nunca dentro de Claupet.

## Haga la suya

Escríbala en lo que quiera: un programa (Python, Node, Go, Rust, .NET…), una biblioteca nativa con una pequeña ABI
de C, o simplemente un servidor HTTP. Un `manifest.json` dice qué ofrece, y `Claupet --extension-pack` convierte la
carpeta en un `.claupet` firmado.

📖 **[La guía de extensiones](https://github.com/darrenarauz21/claupet/blob/main/docs/extensiones/README.md)**
explica cada ranura, el manifiesto, los permisos, la API de la app y ejemplos completos.

¿Tiene una idea para el catálogo oficial? [Abra un issue](https://github.com/darrenarauz21/claupet-extensions/issues).

## Para quien las publica

### Estructura

```text
extensions/<id>/        el código de cada extensión (manifest.json y sus archivos)
catalog.json            el catálogo firmado (se genera, nunca se edita a mano)
docs/catalog.md         el formato del catálogo
```

Cada versión se publica como una Release de GitHub con la etiqueta `<id>-v<versión>` y un archivo,
`<id>-<versión>.claupet`, firmado con la clave oficial de extensiones de Claupet.

### Publicar una versión

1. Suba `version` en `extensions/<id>/manifest.json`.
2. Empaquétela y fírmela **en su equipo** (la clave privada nunca va a GitHub):
   `Claupet.exe --extension-pack extensions/<id> out/<id>-<versión>.claupet --clave ~/.claupet-firma/claupet-extensiones.pem --firmante Claupet`
3. Cree la Release `<id>-v<versión>` con ese archivo.
4. Vuelva a generar y firmar `catalog.json` con `--extension-catalog` (vea [docs/catalog.md](docs/catalog.md)) y haga commit.

## Licencia

Cada extensión declara su licencia en su manifiesto. Claupet es un proyecto personal y no oficial, sin relación con
Anthropic, DeepSeek, Google ni OpenAI; sus nombres y logos son marcas de sus respectivos dueños.
