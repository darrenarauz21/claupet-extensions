"use strict";
// Pruebas de la extensión claupet.contratos: node --test tests
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const EXT = path.join(__dirname, "..", "extensions", "claupet.contratos");
const contratos = require(path.join(EXT, "contratos.js"));

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "contratos-"));
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

const BASE = `---
id: base
tipo: base
titulo: Contrato base
resumen: Reglas mínimas  # un comentario
aplica: ["**/*"]
prioridad: obligatoria
actualizado: 2026-11-20
---

## Reglas

- [alcance] Nada fuera del alcance pedido. \`check: alcance\`
- [ramas] Cada cambio va en su rama desde development; su PR va a development.

\`\`\`
- [en-codigo] Esto no es una regla.
\`\`\`
`;

/** Un proyecto con contratos y una carpeta de perfil vacía (para no leer la de la persona). */
function project() {
  const root = tempDir();
  write(path.join(root, ".claupet", "contratos", "base.md"), BASE);
  write(path.join(root, ".claupet", "contratos", "calidad", "api.md"), `---
id: calidad.api
tipo: calidad
titulo: API
resumen: Cómo se hacen los endpoints
aplica:
  - "**/Api/**"
etiquetas: [api, errores]
prioridad: obligatoria
---
- [errores] Los errores van con su código y un mensaje claro.
`);
  write(path.join(root, ".claupet", "contratos", ".generado", "indice.md"), "no es un contrato");
  fs.mkdirSync(path.join(root, "src", "Api"), { recursive: true });
  const profile = tempDir();
  return { root, profile };
}

test("lee la cabecera, las reglas y sus checks, y salta los bloques de código", () => {
  const doc = contratos.parse(BASE, "base.md", "proyecto");
  assert.equal(doc.id, "base");
  assert.equal(doc.summary, "Reglas mínimas");
  assert.deepEqual(doc.appliesTo, ["**/*"]);
  assert.equal(doc.required, true);
  assert.deepEqual(doc.rules.map((r) => r.id), ["alcance", "ramas"]);
  assert.deepEqual(doc.rules[0].checks, ["alcance"]);
  assert.equal(doc.rules[0].text, "Nada fuera del alcance pedido.");
  assert.deepEqual(doc.issues, []);
});

test("las capas: amplia suma y cambia reglas, reemplaza, apaga y apaga_reglas", () => {
  const p = (text, layer) => contratos.parse(text, layer + ".md", layer);
  const claupet = [
    p("---\nid: estilo.escritura\ntipo: estilo\ntitulo: Escritura\nresumen: r\naplica: [\"**/*\"]\nprioridad: obligatoria\n---\n- [a] uno\n- [b] dos\n", "claupet"),
    p("---\nid: mapa.navegacion\ntipo: mapa\ntitulo: Mapa\nresumen: r\naplica: [\"**/*\"]\nprioridad: obligatoria\n---\n- [m] mapa\n", "claupet"),
    p("---\nid: calidad.pruebas\ntipo: calidad\ntitulo: Pruebas\nresumen: r\naplica: [\"**/*\"]\n---\n- [p] pruebas\n", "claupet"),
  ];
  const perfil = [p("---\nid: estilo.escritura\nmodo: amplia\napaga_reglas: [b]\n---\n- [a] uno, mejor\n- [c] tres\n", "perfil")];
  const proyecto = [
    p("---\nid: mapa.navegacion\nmodo: apaga\n---\n", "proyecto"),
    p("---\nid: calidad.pruebas\nmodo: reemplaza\ntipo: calidad\ntitulo: Pruebas del proyecto\nresumen: r\naplica: [\"**/*\"]\nprioridad: obligatoria\n---\n- [q] otra\n", "proyecto"),
    p("---\nid: estilo.escritura\ntipo: estilo\ntitulo: Repetido\nresumen: r\naplica: [\"**/*\"]\n---\n", "proyecto"),
  ];
  const set = contratos.resolve(claupet, perfil, proyecto);
  const escritura = set.contracts.find((c) => c.id === "estilo.escritura");
  assert.deepEqual(escritura.rules.map((r) => [r.id, r.text, r.off]), [["a", "uno, mejor", false], ["b", "dos", true], ["c", "tres", false]]);
  assert.equal(set.contracts.find((c) => c.id === "mapa.navegacion").enabled, false);
  const pruebas = set.contracts.find((c) => c.id === "calidad.pruebas");
  assert.equal(pruebas.title, "Pruebas del proyecto");
  assert.deepEqual(pruebas.rules.map((r) => r.id), ["q"]);
  // Un «nuevo» con un id que ya existe es un error, y no pisa al de abajo.
  assert.ok(set.issues.some((i) => i.message.includes("ya existe")));
  assert.equal(escritura.title, "Escritura");
  // Ordenados como cpt: por tipo y después por id.
  assert.deepEqual(set.contracts.map((c) => c.id), ["calidad.pruebas", "estilo.escritura", "mapa.navegacion"]);
});

test("encuentra el proyecto desde una subcarpeta y lleva los paquetes de Claupet", () => {
  const { root, profile } = project();
  const set = contratos.load(path.join(root, "src", "Api"), path.join(EXT, "paquetes"), { CLAUPET_CONTRATOS_PERFIL: profile });
  assert.equal(set.projectFolder, path.join(root, ".claupet", "contratos"));
  const ids = set.contracts.map((c) => c.id);
  assert.ok(ids.includes("base") && ids.includes("calidad.api"));
  // Los cuatro paquetes de Claupet, como cpt.
  for (const id of ["calidad.pruebas", "estilo.escritura", "estilo.diseno", "mapa.navegacion"]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.some((id) => id.includes("indice")), "lo de .generado no es un contrato");
  assert.deepEqual(set.issues, []);
  assert.deepEqual(contratos.search(set, "ERRORES api")[0].contract.id, "calidad.api");
});

/** Arranca el servidor como lo hace un agente (en la carpeta de su sesión) y le manda líneas; devuelve las respuestas. */
function talk(cwd, profile, lines) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(EXT, "server.js")], {
      cwd, env: { ...process.env, CLAUPET_CONTRATOS_PERFIL: profile, CLAUPET_LANGUAGE: "es" },
    });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("error", reject);
    child.on("close", () => resolve(out.split("\n").filter(Boolean).map((l) => JSON.parse(l))));
    for (const line of lines) child.stdin.write((typeof line === "string" ? line : JSON.stringify(line)) + "\n");
    child.stdin.end();
  });
}

test("el servidor da las reglas obligatorias al conectarse y las herramientas para leer las demás", async () => {
  const { root, profile } = project();
  const call = (id, name, args) => ({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
  const replies = await talk(path.join(root, "src"), profile, [
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    call(3, "contract_read", { id: "base" }),
    call(4, "contract_search", { query: "ramas" }),
    call(5, "contract_read", { id: "no.existe" }),
    call(6, "contract_list", {}),
    { jsonrpc: "2.0", id: 7, method: "nada" },
    "{roto",
  ]);
  const byId = Object.fromEntries(replies.filter((r) => r.id !== null).map((r) => [r.id, r]));
  // La notificación no tiene respuesta.
  assert.equal(replies.length, 8);

  const init = byId[1].result;
  assert.equal(init.serverInfo.name, "claupet-contratos");
  assert.match(init.instructions, /Reglas obligatorias de este proyecto/);
  assert.match(init.instructions, /\[ramas\] Cada cambio va en su rama desde development/);
  assert.match(init.instructions, /\[sin-emojis\]/, "las obligatorias de los paquetes de Claupet también");
  assert.match(init.instructions, /calidad\.api: API · \*\*\/Api\/\*\*/, "las de algunas rutas, por nombre");
  assert.doesNotMatch(init.instructions, /en-codigo/);

  assert.deepEqual(byId[2].result.tools.map((t) => t.name), ["contract_list", "contract_search", "contract_read"]);
  assert.ok(byId[2].result.tools.every((t) => t.annotations.readOnlyHint));
  assert.match(byId[3].result.content[0].text, /^# Contrato base \(base\)/);
  assert.match(byId[3].result.content[0].text, /- \[ramas\]/);
  assert.match(byId[4].result.content[0].text, /^base · Contrato base \(obligatorio\)/);
  assert.equal(byId[5].result.isError, true);
  assert.ok(JSON.parse(byId[6].result.content[0].text).contratos.some((c) => c.id === "calidad.api"));
  assert.equal(byId[7].error.code, -32601);
  assert.ok(replies.some((r) => r.id === null && r.error?.code === -32700));
});

test("en una carpeta sin contratos solo explica cómo usarlos", async () => {
  const replies = await talk(tempDir(), tempDir(), [{ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }]);
  const instructions = replies[0].result.instructions;
  assert.match(instructions, /^Contratos Claupet/);
  assert.doesNotMatch(instructions, /Reglas obligatorias/);
});

test("el manifiesto: la ranura mcp con node, y un nombre de servidor que no empieza con claupet", () => {
  const m = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
  assert.equal(m.id, "claupet.contratos");
  assert.deepEqual(m.provides, ["mcp"]);
  const servers = Object.keys(m.mcp);
  assert.deepEqual(servers, ["contratos"]);
  assert.match(servers[0], /^[a-z][a-z0-9_-]{0,31}$/);
  assert.ok(!servers[0].startsWith("claupet"));
  assert.deepEqual(m.mcp.contratos, { type: "stdio", program: "node", args: ["{package}/server.js"] });
});
