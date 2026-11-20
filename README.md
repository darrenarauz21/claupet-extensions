<div align="center">

<img src="https://raw.githubusercontent.com/darrenarauz21/claupet/main/docs/capturas/mascotas.png" alt="Claupet's pets dancing together" width="560">

# Claupet Extensions

**New pets, voices, sounds, skills and tools for your coding agents. Signed, verified, one click away.**

**English** · [Español](README.es.md)

![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-D97757)
![Signed](https://img.shields.io/badge/packages-signed%20ES256-2A1F1A)
![Catalog](https://img.shields.io/badge/catalog-verified-6DB283)
![Any language](https://img.shields.io/badge/write%20them%20in-any%20language-8B5CF6)

[What they add](#what-extensions-add) · [Install one](#install-one) · [Safe by design](#safe-by-design) · [Make your own](#make-your-own) · [Get Claupet](https://github.com/darrenarauz21/claupet)

</div>

---

[Claupet](https://github.com/darrenarauz21/claupet) keeps your usage, your coding-agent sessions and a little
desktop pet next to the clock. Extensions make it yours: a new character, another voice, the model you prefer for
the assistant, or extra tools for Claude Code, Codex, Gemini, Copilot and OpenCode. This repository is the official
home for them, and the signed catalog Claupet reads to list, install and update them.

## What extensions add

- 🐾 **Pets.** A whole new character on your desktop, with its own animations, in place of Chibi.
- 🗣️ **Voices and speech.** New voices and voice styles for Claupet, or your own speech-to-text engine.
- 🔊 **Sound packs.** A different sound for every heads-up: finished, waiting for you, permission, limits.
- 🧠 **Assistants.** Answer from the pet and the island with the model you like: DeepSeek, Ollama, LM Studio,
  OpenRouter, Groq or any OpenAI-compatible server.
- 🧩 **Skills.** Your own `/commands` in Claupet's chat, and code that reacts to notices, sessions, tool use or
  files dropped on the pet. The pet can speak, animate and show cards on the island for you.
- 🛠️ **Tools for your coding agents.** MCP servers that every session in Claupet Terminal gets at once, whatever the
  agent: Claude Code, Codex, Gemini CLI, Copilot CLI or OpenCode.
- 🧑‍🔬 **Specialists** *(experimental)*. Ready-made agents with their role, instructions and tools, that your
  sessions can delegate work to.

## Install one

Open **Claupet Console › Settings › Extensions**. The catalog lists every official extension with what it brings;
**Install** downloads it, checks it and turns it on. When there's a new version, **Update** shows up right there, and
each extension has its own page to switch it off, review its permissions and settings, or uninstall it. Got a
`.claupet` file from somewhere else? Drop it on the pet, or use **Install from file…**.

> [!NOTE]
> Extensions run on **Windows** for now. The catalog is brand new: the first official extensions are on their way.

## Safe by design

- ✍️ **Signed packages.** Every `.claupet` is signed (ES256). Claupet shows who signed it, and an official extension
  carries the official Claupet key, built into the app.
- 📜 **A signed catalog.** Claupet only trusts the catalog if its signature matches that key, never goes back to an
  older one, and only installs a package whose size and SHA-256 match what the catalog says.
- 🔐 **You decide what it can do.** Each extension asks for the capabilities it needs (speaking through the pet,
  notices, the microphone, using Claude on your plan…) and you approve them. Secrets stay encrypted on your computer.
- 🧱 **Kept apart.** Extensions run in their own process, never inside Claupet.

## Make your own

Write it in whatever you like: a program (Python, Node, Go, Rust, .NET…), a native library with a small C ABI, or
just an HTTP server. One `manifest.json` describes what it provides, and `Claupet --extension-pack` turns the folder
into a signed `.claupet`.

📖 **[The extensions guide](https://github.com/darrenarauz21/claupet/blob/main/docs/extensiones/README.md)** (in
Spanish) covers every slot, the manifest, permissions, the host API and complete examples.

Have an idea for the official catalog? [Open an issue](https://github.com/darrenarauz21/claupet-extensions/issues).

## For maintainers

### Layout

```text
extensions/<id>/        source of each extension (manifest.json + its files)
catalog.json            signed catalog (generated, never edited by hand)
docs/catalog.md         catalog format
```

Each version is published as a GitHub Release with the tag `<id>-v<version>` and one asset,
`<id>-<version>.claupet`, signed with the official Claupet extensions key.

### Publishing a version

1. Bump `version` in `extensions/<id>/manifest.json`.
2. Pack and sign it **locally** (the private key never goes to GitHub):
   `Claupet.exe --extension-pack extensions/<id> out/<id>-<version>.claupet --clave ~/.claupet-firma/claupet-extensiones.pem --firmante Claupet`
3. Create the Release `<id>-v<version>` with that file.
4. Regenerate and sign `catalog.json` with `--extension-catalog` (see [docs/catalog.md](docs/catalog.md)), then commit it.

## License

Each extension declares its own license in its manifest. Claupet is a personal, unofficial project, not affiliated
with Anthropic, DeepSeek, Google or OpenAI; their names and logos are trademarks of their respective owners.
