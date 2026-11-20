# Contratos Claupet

Las reglas de cada proyecto para **todos** los agentes que abre Claupet: Claude Code, Codex, Gemini CLI, Copilot CLI
y OpenCode.

- Ocupa la ranura `mcp`: Claupet suma su servidor a cada agente al abrirlo, y el agente lo arranca en la carpeta de
  su sesión.
- Ahí busca `.claupet/contratos/` hacia arriba, como git, y junta tres capas, como `cpt`: los paquetes de Claupet que
  trae la extensión (`paquetes/`), los del perfil de la persona y los del proyecto.
- Al conectarse, el agente recibe en las instrucciones las **reglas obligatorias** que valen para todo el proyecto. Las
  obligatorias de algunas rutas van por nombre.
- Tres herramientas de solo lectura: `contract_list`, `contract_search` y `contract_read`. Responden lo mismo que
  `cpt mcp`.

Necesita [Node.js](https://nodejs.org) (sin dependencias). Las reglas viven en cada proyecto, en `.claupet/contratos/`,
y se crean con `cpt contracts init`. El formato está en la
[especificación](https://github.com/darrenarauz21/claupet/blob/main/docs/contratos/especificacion.md).

**Paquetes de Claupet:** `paquetes/` es una copia de `Core/Contratos/Paquetes` del repositorio de Claupet. Si cambian
allá, se copian aquí y se publica una versión nueva de la extensión: Claupet no necesita actualizarse.

**Pruebas:** `node --test tests` en la raíz de este repositorio.

---

# Claupet Contracts

Each project's rules for **every** agent Claupet opens. It fills the `mcp` slot; the agent starts the server in its
session folder, which looks for `.claupet/contratos/` upward and joins Claupet's bundled packages, the person's
profile and the project, like `cpt`. On connect, the agent gets the project's required rules in the instructions, and
has `contract_list`, `contract_search` and `contract_read` (read-only, same answers as `cpt mcp`). Needs Node.js.
