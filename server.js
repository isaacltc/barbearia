const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, join, resolve } = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const configuredPort = typeof process !== "undefined" && process.env
    ? Number(process.env.PORT)
    : 0;
const PORT = configuredPort || 5055;
const root = __dirname;
const db = new DatabaseSync(join(root, "barber.db"));

db.exec(`
    CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT NOT NULL,
        data TEXT NOT NULL,
        hora TEXT NOT NULL,
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

const insertAgendamento = db.prepare(`
    INSERT INTO agendamentos (nome, telefone, data, hora)
    VALUES (?, ?, ?, ?)
`);

const listAgendamentos = db.prepare(`
    SELECT id, nome, telefone, data, hora, criado_em
    FROM agendamentos
    ORDER BY id DESC
`);

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".webp": "image/webp"
};

function send(res, status, content, type = "text/plain; charset=utf-8") {
    res.writeHead(status, {
        "Content-Type": type,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    });
    res.end(content);
}

async function readBody(req) {
    let body = "";

    for await (const chunk of req) {
        body += chunk;
    }

    return body ? JSON.parse(body) : {};
}

function resolvePage(pathname) {
    const pages = {
        "/": "index.html",
        "/inicio": "index.html",
        "/agendamento": "agendamento.html",
        "/contato": "cont.html",
        "/cadastro": "cadrasto.html"
    };

    return pages[pathname] || pathname.replace("/", "");
}

async function serveFile(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const fileName = resolvePage(decodeURIComponent(url.pathname));
    const filePath = resolve(root, fileName);

    if (!filePath.startsWith(root)) {
        return send(res, 403, "Acesso negado");
    }

    try {
        const content = await readFile(filePath);
        const type = mimeTypes[extname(filePath)] || "application/octet-stream";
        return send(res, 200, content, type);
    } catch (error) {
        return send(res, 404, "Pagina nao encontrada");
    }
}

async function handleAgendamento(req, res) {
    try {
        const { nome, telefone, data, hora } = await readBody(req);

        if (!nome || !telefone || !data || !hora) {
            return send(res, 400, "Preencha todos os campos do agendamento.");
        }

        insertAgendamento.run(nome.trim(), telefone.trim(), data, hora);
        return send(res, 201, "Agendamento salvo no banco de dados.");
    } catch (error) {
        return send(res, 400, "Nao foi possivel salvar o agendamento.");
    }
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === "OPTIONS") {
        return send(res, 204, "");
    }

    if (req.method === "POST" && url.pathname === "/agendamento") {
        return handleAgendamento(req, res);
    }

    if (req.method === "GET" && url.pathname === "/api/agendamentos") {
        return send(res, 200, JSON.stringify(listAgendamentos.all()), "application/json; charset=utf-8");
    }

    if (req.method === "GET") {
        return serveFile(req, res);
    }

    return send(res, 405, "Metodo nao permitido");
});

function startServer(port = PORT) {
    if (server.listening) {
        return server;
    }

    server.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
        console.log(`Banco de dados: ${join(root, "barber.db")}`);
    });

    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = {
    PORT,
    db,
    server,
    startServer
};
