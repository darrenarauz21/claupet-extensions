"use strict";
// Contratos Claupet para los agentes: un servidor MCP sin dependencias (JSON-RPC por stdin/stdout, un mensaje por
// línea). Claupet lo suma a cada agente que abre (Claude Code, Codex, Gemini CLI, Copilot CLI, OpenCode). El agente lo
// arranca en la carpeta de su sesión: ahí se buscan los contratos del proyecto (.claupet/contratos, hacia arriba).
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const contratos = require("./contratos");

const es = !(process.env.CLAUPET_LANGUAGE || "es").toLowerCase().startsWith("en");
const S = (a, b) => (es ? a : b);
const packages = path.join(__dirname, "paquetes");
const version = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8")).version; } catch { return "1.0.0"; }
})();
const PROTOCOL = "2025-06-18";

/** Se leen en cada pedido: si alguien cambia un contrato durante la sesión, el agente ve el de ahora. */
const load = () => contratos.load(process.cwd(), packages);

const readOnly = { readOnlyHint: true };
const tools = [
  {
    name: "contract_list",
    description: S("El índice de contratos: id, tipo, título, resumen, a qué rutas aplica y si es obligatorio.",
      "The contract index: id, type, title, summary, which paths it applies to and whether it is required."),
    inputSchema: { type: "object", properties: {} },
    annotations: readOnly,
  },
  {
    name: "contract_search",
    description: S("Busca contratos por id, etiqueta, título, resumen o texto de sus reglas.",
      "Search contracts by id, tag, title, summary or rule text."),
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: S("Qué buscar, por ejemplo «api errores» o «login»", "What to search, e.g. «api errors» or «login»") } },
      required: ["query"],
    },
    annotations: readOnly,
  },
  {
    name: "contract_read",
    description: S("Un contrato completo con sus reglas resueltas por capas.", "A full contract with its rules resolved by layer."),
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: S("El id del contrato, por ejemplo «estilo.escritura»", "The contract id, e.g. «estilo.escritura»") } },
      required: ["id"],
    },
    annotations: readOnly,
  },
];

class Failure extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const text = (t, isError = false) => ({ content: [{ type: "text", text: t }], isError });

function call(name, args) {
  const arg = (key) => {
    const v = args?.[key];
    if (typeof v !== "string" || !v.trim()) throw new Failure(-32602, `Missing argument: ${key}`);
    return v.trim();
  };
  const set = load();
  switch (name) {
    case "contract_list":
      return text(JSON.stringify(contratos.index(set), null, 2));
    case "contract_search": {
      const query = arg("query");
      const hits = contratos.search(set, query);
      if (!hits.length) return text(S(`Nada coincide con «${query}». Prueba contract_list.`, `Nothing matches «${query}». Try contract_list.`));
      return text(hits.slice(0, 10).map((h) => {
        let out = `${h.contract.id} · ${h.contract.title}${h.contract.required ? S(" (obligatorio)", " (required)") : ""}\n  ${h.contract.summary}`;
        for (const r of h.rules.slice(0, 3)) out += `\n  [${r.id}] ${r.text}`;
        return out;
      }).join("\n"));
    }
    case "contract_read": {
      const id = arg("id");
      const c = set.contracts.find((x) => x.id.toLowerCase() === id.toLowerCase());
      return c ? text(contratos.render(c, es)) : text(S(`No hay un contrato «${id}».`, `There is no contract «${id}».`), true);
    }
    default:
      throw new Failure(-32602, "Unknown tool: " + name);
  }
}

function dispatch(method, params) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: typeof params?.protocolVersion === "string" && params.protocolVersion ? params.protocolVersion : PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: "claupet-contratos", title: "Claupet Contracts", version },
        instructions: contratos.instructions(load(), es),
      };
    case "ping": return {};
    case "tools/list": return { tools };
    case "tools/call": return call(params?.name, params?.arguments ?? {});
    default: throw new Failure(-32601, "Method not found: " + method);
  }
}

/** Atiende una línea; devuelve la respuesta, o null si era una notificación. */
function handle(line) {
  let id = null;
  try {
    const m = JSON.parse(line);
    if (m === null || typeof m !== "object") throw new Failure(-32700, "Parse error");
    if (m.id === undefined || m.id === null) return null; // notificaciones: nada que responder
    id = m.id;
    return { jsonrpc: "2.0", id, result: dispatch(m.method ?? "", m.params) };
  } catch (e) {
    const code = e instanceof Failure ? e.code : e instanceof SyntaxError ? -32700 : -32603;
    return { jsonrpc: "2.0", id, error: { code, message: e instanceof SyntaxError ? "Parse error" : e.message } };
  }
}

if (require.main === module) {
  readline.createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    const reply = handle(line);
    if (reply) process.stdout.write(JSON.stringify(reply) + "\n");
  });
}

module.exports = { handle };
