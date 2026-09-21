// ============================================================
// MEDCORE — SISTEMA HOSPITALAR
// SERVER.JS
// ============================================================

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// ============================================================
// CONFIGURAÇÕES
// ============================================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Frontend
app.use(express.static(path.join(__dirname, "frontend")));

// ============================================================
// BANCO DE DADOS JSON
// ============================================================

const DB_PATH = path.join(__dirname, "db.json");

function carregarDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const bancoInicial = {
                usuarios: [],
                pacientes: [],
                triagens: [],
                consultas: [],
                medicacoes: [],
                tv_chamada: null,
                tv_historico: [],
                altas: []
            };

            fs.writeFileSync(
                DB_PATH,
                JSON.stringify(bancoInicial, null, 2),
                "utf8"
            );

            return bancoInicial;
        }

        const dados = fs.readFileSync(DB_PATH, "utf8");

        if (!dados.trim()) {
            return {
                usuarios: [],
                pacientes: [],
                triagens: [],
                consultas: [],
                medicacoes: [],
                tv_chamada: null,
                tv_historico: [],
                altas: []
            };
        }

        const db = JSON.parse(dados);

        // Garante que todas as tabelas existam
        db.usuarios = Array.isArray(db.usuarios) ? db.usuarios : [];
        db.pacientes = Array.isArray(db.pacientes) ? db.pacientes : [];
        db.triagens = Array.isArray(db.triagens) ? db.triagens : [];
        db.consultas = Array.isArray(db.consultas) ? db.consultas : [];
        db.medicacoes = Array.isArray(db.medicacoes) ? db.medicacoes : [];
        db.tv_historico = Array.isArray(db.tv_historico)
            ? db.tv_historico
            : [];
        db.altas = Array.isArray(db.altas) ? db.altas : [];

        if (!("tv_chamada" in db)) {
            db.tv_chamada = null;
        }

        return db;

    } catch (erro) {
        console.error("Erro ao carregar banco:", erro);

        return {
            usuarios: [],
            pacientes: [],
            triagens: [],
            consultas: [],
            medicacoes: [],
            tv_chamada: null,
            tv_historico: [],
            altas: []
        };
    }
}

let db = carregarDB();

function salvarDB() {
    try {
        fs.writeFileSync(
            DB_PATH,
            JSON.stringify(db, null, 2),
            "utf8"
        );

        return true;

    } catch (erro) {
        console.error("Erro ao salvar banco:", erro);
        return false;
    }
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function gerarId(prefixo = "") {
    return (
        prefixo +
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 7)
    ).toUpperCase();
}

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function dataAtualISO() {
    return new Date().toISOString();
}

function formatarData(data) {
    if (!data) return "";

    const d = new Date(data);

    if (isNaN(d.getTime())) {
        return "";
    }

    return d.toLocaleDateString("pt-BR");
}

function formatarHora(data) {
    if (!data) return "";

    const d = new Date(data);

    if (isNaN(d.getTime())) {
        return "";
    }

    return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ============================================================
// ROTA INICIAL
// ============================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "frontend", "index.html")
    );
});

// ============================================================
// LOGIN
// ============================================================

app.post("/login", (req, res) => {
    try {
        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Usuário e senha são obrigatórios."
            });
        }

        const encontrado = db.usuarios.find((u) => {
            return (
                String(u.usuario).toLowerCase() ===
                    String(usuario).toLowerCase() &&
                String(u.senha) === String(senha)
            );
        });

        if (!encontrado) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário ou senha inválidos."
            });
        }

        return res.json({
            sucesso: true,
            mensagem: "Login realizado com sucesso.",
            usuario: {
                id: encontrado.id,
                nome: encontrado.nome,
                usuario: encontrado.usuario,
                tipo: encontrado.tipo
            }
        });

    } catch (erro) {
        console.error("Erro no login:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno no login."
        });
    }
});

// ============================================================
// CADASTRO DE PACIENTE
// ============================================================

app.post("/atendimento", (req, res) => {
    try {
        const {
            nome,
            nomeCompleto,
            cpf,
            mae,
            nascimento,
            estadoCivil,
            contatoEmergencia,
            endereco,
            email,
            telefone
        } = req.body;

        const nomePaciente = nomeCompleto || nome;

        if (!nomePaciente) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "O nome completo do paciente é obrigatório."
            });
        }

        const paciente = {
            id: gerarId("PAC"),
            nome: nomePaciente,
            nomeCompleto: nomePaciente,
            cpf: cpf || "",
            mae: mae || "",
            nascimento: nascimento || "",
            estadoCivil: estadoCivil || "",
            contatoEmergencia: contatoEmergencia || "",
            endereco: endereco || "",
            email: email || "",
            telefone: telefone || "",
            status: "aguardando",
            dataEntrada: dataAtualISO(),
            createdAt: dataAtualISO()
        };

        db.pacientes.push(paciente);

        salvarDB();

        res.status(201).json({
            sucesso: true,
            mensagem: "Paciente cadastrado com sucesso.",
            paciente
        });

    } catch (erro) {
        console.error("Erro ao cadastrar paciente:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao cadastrar paciente."
        });
    }
});

// ============================================================
// BUSCAR PACIENTES
// ============================================================

app.get("/pacientes", (req, res) => {
    try {
        const busca = normalizarTexto(req.query.busca || "");

        let pacientes = [...db.pacientes];

        if (busca) {
            pacientes = pacientes.filter((paciente) => {

                const nome = normalizarTexto(
                    paciente.nome ||
                    paciente.nomeCompleto
                );

                const cpf = normalizarTexto(
                    paciente.cpf
                );

                const id = normalizarTexto(
                    paciente.id
                );

                return (
                    nome.includes(busca) ||
                    cpf.includes(busca) ||
                    id.includes(busca)
                );
            });
        }

        res.json(pacientes);

    } catch (erro) {
        console.error("Erro ao buscar pacientes:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar pacientes."
        });
    }
});

// ============================================================
// BUSCAR UM PACIENTE PELO ID
// ============================================================

app.get("/pacientes/:id", (req, res) => {
    try {
        const paciente = db.pacientes.find(
            (p) => String(p.id) === String(req.params.id)
        );

        if (!paciente) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Paciente não encontrado."
            });
        }

        res.json(paciente);

    } catch (erro) {
        console.error("Erro ao buscar paciente:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar paciente."
        });
    }
});

// ============================================================
// TRIAGEM
// ============================================================

app.post("/triagem", (req, res) => {
    try {
        const {
            pacienteId,
            paciente,
            pressao,
            temperatura,
            saturacao,
            frequenciaCardiaca,
            sintomas,
            observacoes,
            prioridade
        } = req.body;

        let pacienteEncontrado = null;

        if (pacienteId) {
            pacienteEncontrado = db.pacientes.find(
                (p) => String(p.id) === String(pacienteId)
            );
        }

        if (!pacienteEncontrado && paciente) {
            const busca = normalizarTexto(paciente);

            pacienteEncontrado = db.pacientes.find(
                (p) =>
                    normalizarTexto(p.nome).includes(busca) ||
                    normalizarTexto(p.nomeCompleto).includes(busca)
            );
        }

        if (!pacienteEncontrado) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Paciente não encontrado."
            });
        }

        let classificacao = prioridade || "Normal";

        const temp = parseFloat(temperatura);

        if (!isNaN(temp)) {
            if (temp >= 39) {
                classificacao = "Urgente";
            } else if (temp >= 38) {
                classificacao = "Prioridade";
            }
        }

        const novaTriagem = {
            id: gerarId("TRI"),
            pacienteId: pacienteEncontrado.id,
            paciente: pacienteEncontrado.nome,
            pressao: pressao || "",
            temperatura: temperatura || "",
            saturacao: saturacao || "",
            frequenciaCardiaca: frequenciaCardiaca || "",
            sintomas: sintomas || "",
            observacoes: observacoes || "",
            prioridade: classificacao,
            status: "aguardando",
            createdAt: dataAtualISO()
        };

        db.triagens.push(novaTriagem);

        pacienteEncontrado.status = "triagem";
        pacienteEncontrado.ultimaTriagem = novaTriagem.createdAt;

        salvarDB();

        res.status(201).json({
            sucesso: true,
            mensagem: "Triagem registrada com sucesso.",
            triagem: novaTriagem
        });

    } catch (erro) {
        console.error("Erro na triagem:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao registrar triagem."
        });
    }
});

// ============================================================
// LISTAR TRIAGENS
// ============================================================

app.get("/triagens", (req, res) => {
    try {
        const triagens = [...db.triagens].reverse();

        res.json(triagens);

    } catch (erro) {
        console.error("Erro ao buscar triagens:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar triagens."
        });
    }
});

// ============================================================
// CHAMAR PACIENTE NA TV
// ============================================================

app.post("/tv/chamar", (req, res) => {
    try {
        const {
            pacienteId,
            paciente,
            consultorio,
            medico
        } = req.body;

        if (!pacienteId && !paciente) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe o paciente."
            });
        }

        let pacienteEncontrado = null;

        if (pacienteId) {
            pacienteEncontrado = db.pacientes.find(
                (p) => String(p.id) === String(pacienteId)
            );
        }

        if (!pacienteEncontrado && paciente) {
            const busca = normalizarTexto(paciente);

            pacienteEncontrado = db.pacientes.find(
                (p) =>
                    normalizarTexto(p.nome).includes(busca)
            );
        }

        const chamada = {
            id: gerarId("TV"),
            pacienteId:
                pacienteEncontrado?.id ||
                pacienteId ||
                "",
            paciente:
                pacienteEncontrado?.nome ||
                paciente ||
                "",
            consultorio: consultorio || "01",
            medico: medico || "",
            status: "chamando",
            createdAt: dataAtualISO()
        };

        db.tv_chamada = chamada;

        db.tv_historico.unshift(chamada);

        salvarDB();

        res.json({
            sucesso: true,
            mensagem: "Paciente chamado na TV.",
            chamada
        });

    } catch (erro) {
        console.error("Erro ao chamar paciente:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao chamar paciente."
        });
    }
});

// ============================================================
// CONSULTAR CHAMADA ATUAL DA TV
// ============================================================

app.get("/tv/chamada", (req, res) => {
    try {
        res.json(
            db.tv_chamada || null
        );

    } catch (erro) {
        console.error("Erro ao consultar chamada:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao consultar chamada."
        });
    }
});

// ============================================================
// FINALIZAR CHAMADA DA TV
// ============================================================

app.delete("/tv/chamada", (req, res) => {
    try {
        db.tv_chamada = null;

        salvarDB();

        res.json({
            sucesso: true,
            mensagem: "Chamada finalizada."
        });

    } catch (erro) {
        console.error("Erro ao finalizar chamada:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao finalizar chamada."
        });
    }
});

// ============================================================
// LISTA DE MEDICAÇÕES
// ============================================================

app.get("/lista-medicacoes", (req, res) => {
    try {
        res.json(db.medicacoes);

    } catch (erro) {
        console.error(
            "Erro ao buscar medicamentos:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar medicamentos."
        });
    }
});

// ============================================================
// CADASTRAR MEDICAÇÃO
// ============================================================

app.post("/medicacoes", (req, res) => {
    try {
        const {
            nome,
            principioAtivo,
            dosagem,
            quantidade,
            observacoes
        } = req.body;

        if (!nome) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Nome da medicação é obrigatório."
            });
        }

        const medicacao = {
            id: gerarId("MED"),
            nome,
            principioAtivo: principioAtivo || "",
            dosagem: dosagem || "",
            quantidade: quantidade || "",
            observacoes: observacoes || "",
            createdAt: dataAtualISO()
        };

        db.medicacoes.push(medicacao);

        salvarDB();

        res.status(201).json({
            sucesso: true,
            mensagem: "Medicação cadastrada.",
            medicacao
        });

    } catch (erro) {
        console.error(
            "Erro ao cadastrar medicação:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao cadastrar medicação."
        });
    }
});

// ============================================================
// CONSULTA MÉDICA
// ============================================================

app.post("/consulta", (req, res) => {
    try {
        const {
            pacienteId,
            paciente,
            medico,
            consultorio,
            diagnostico,
            observacoes,
            prescricao
        } = req.body;

        if (!pacienteId && !paciente) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe o paciente."
            });
        }

        const consulta = {
            id: gerarId("CON"),
            pacienteId: pacienteId || "",
            paciente: paciente || "",
            medico: medico || "",
            consultorio: consultorio || "",
            diagnostico: diagnostico || "",
            observacoes: observacoes || "",
            prescricao: prescricao || "",
            status: "realizada",
            createdAt: dataAtualISO()
        };

        db.consultas.push(consulta);

        salvarDB();

        res.status(201).json({
            sucesso: true,
            mensagem: "Consulta registrada.",
            consulta
        });

    } catch (erro) {
        console.error(
            "Erro ao registrar consulta:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao registrar consulta."
        });
    }
});

// ============================================================
// LISTAR CONSULTAS
// ============================================================

app.get("/consultas", (req, res) => {
    try {
        res.json(
            [...db.consultas].reverse()
        );

    } catch (erro) {
        console.error(
            "Erro ao buscar consultas:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar consultas."
        });
    }
}); 
// ============================================================
// FUNÇÕES PARA PDF
// ============================================================

function escaparPDF(texto) {
    if (texto === null || texto === undefined) {
        return "";
    }

    return String(texto)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function removerAcentos(texto) {
    if (texto === null || texto === undefined) {
        return "";
    }

    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function quebrarTexto(texto, tamanho = 85) {
    texto = removerAcentos(texto || "");

    const palavras = texto.split(/\s+/);
    const linhas = [];

    let linha = "";

    palavras.forEach((palavra) => {

        const tentativa =
            (linha + " " + palavra).trim();

        if (tentativa.length <= tamanho) {
            linha = tentativa;
        } else {

            if (linha) {
                linhas.push(linha);
            }

            linha = palavra;
        }
    });

    if (linha) {
        linhas.push(linha);
    }

    return linhas;
}

// ============================================================
// GERAR PDF DA ALTA
// ============================================================

function gerarPDFAlta(alta) {

    const objetos = [];

    function adicionarObjeto(conteudo) {
        objetos.push(conteudo);
        return objetos.length;
    }

    const linhas = [];

    // --------------------------------------------------------
    // CABEÇALHO
    // --------------------------------------------------------

    linhas.push({
        texto: "MEDCORE",
        tamanho: 22,
        bold: true,
        centralizado: true
    });

    linhas.push({
        texto: "SISTEMA HOSPITALAR",
        tamanho: 10,
        bold: false,
        centralizado: true
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    linhas.push({
        texto: "TERMO DE ALTA MEDICA",
        tamanho: 16,
        bold: true,
        centralizado: true
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    // --------------------------------------------------------
    // DADOS DO PACIENTE
    // --------------------------------------------------------

    linhas.push({
        texto: "DADOS DO PACIENTE",
        tamanho: 12,
        bold: true
    });

    linhas.push({
        texto:
            "Nome completo: " +
            (alta.paciente || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "CPF: " +
            (alta.cpf || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "Nome da mae: " +
            (alta.mae || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "Data de nascimento: " +
            (alta.nascimento || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "Estado civil: " +
            (alta.estadoCivil || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "Telefone: " +
            (alta.telefone || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "E-mail: " +
            (alta.email || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "Endereco: " +
            (alta.endereco || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    // --------------------------------------------------------
    // DADOS DO ATENDIMENTO
    // --------------------------------------------------------

    linhas.push({
        texto: "DADOS DO ATENDIMENTO",
        tamanho: 12,
        bold: true
    });

    linhas.push({
        texto:
            "Data da alta: " +
            (alta.data || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "Horario da alta: " +
            (alta.hora || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "Status: ALTA MEDICA",
        tamanho: 10,
        bold: true
    });

    linhas.push({
        texto:
            "Condicao na alta: " +
            (alta.condicao || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    // --------------------------------------------------------
    // DIAGNÓSTICO
    // --------------------------------------------------------

    linhas.push({
        texto: "DIAGNOSTICO",
        tamanho: 12,
        bold: true
    });

    quebrarTexto(
        alta.diagnostico ||
        "Nao informado"
    ).forEach((texto) => {

        linhas.push({
            texto,
            tamanho: 10
        });
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    // --------------------------------------------------------
    // RESUMO DO ATENDIMENTO
    // --------------------------------------------------------

    linhas.push({
        texto: "RESUMO DO ATENDIMENTO",
        tamanho: 12,
        bold: true
    });

    quebrarTexto(
        alta.resumo ||
        "Nenhum resumo informado."
    ).forEach((texto) => {

        linhas.push({
            texto,
            tamanho: 10
        });
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    // --------------------------------------------------------
    // MEDICAÇÕES
    // --------------------------------------------------------

    linhas.push({
        texto: "MEDICACAO / PRESCRICOES",
        tamanho: 12,
        bold: true
    });

    quebrarTexto(
        alta.medicacao ||
        "Nenhuma"
    ).forEach((texto) => {

        linhas.push({
            texto,
            tamanho: 10
        });
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    // --------------------------------------------------------
    // ORIENTAÇÕES
    // --------------------------------------------------------

    linhas.push({
        texto: "ORIENTACOES",
        tamanho: 12,
        bold: true
    });

    quebrarTexto(
        alta.orientacoes ||
        "Nenhuma orientacao registrada."
    ).forEach((texto) => {

        linhas.push({
            texto,
            tamanho: 10
        });
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    // --------------------------------------------------------
    // RETORNO
    // --------------------------------------------------------

    linhas.push({
        texto:
            "Retorno / acompanhamento: " +
            (alta.retorno || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto:
            "Medico responsavel: " +
            (alta.medico || "Nao informado"),
        tamanho: 10
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    // --------------------------------------------------------
    // TEXTO FINAL
    // --------------------------------------------------------

    quebrarTexto(
        "Declara-se, para os devidos fins, que o paciente acima identificado recebeu alta medica apos avaliacao e conclusao do atendimento."
    ).forEach((texto) => {

        linhas.push({
            texto,
            tamanho: 10
        });
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    linhas.push({
        texto:
            "________________________________________",
        tamanho: 10,
        centralizado: true
    });

    linhas.push({
        texto:
            "Assinatura do medico responsavel",
        tamanho: 10,
        centralizado: true
    });

    linhas.push({
        texto: "",
        tamanho: 10
    });

    linhas.push({
        texto:
            "Documento gerado automaticamente pelo sistema MEDCORE.",
        tamanho: 8,
        centralizado: true
    });

    linhas.push({
        texto:
            "Data de emissao: " +
            (alta.data || "") +
            " as " +
            (alta.hora || ""),
        tamanho: 8,
        centralizado: true
    });

    // ========================================================
    // CONTEÚDO DO PDF
    // ========================================================

    let conteudo = "";
    let y = 800;

    linhas.forEach((linha) => {

        const texto =
            escaparPDF(
                removerAcentos(linha.texto)
            );

        const tamanho =
            linha.tamanho || 10;

        const fonte =
            linha.bold
                ? "Helvetica-Bold"
                : "Helvetica";

        // Espaçamento
        if (linha.texto === "") {
            y -= 10;
            return;
        }

        let x = 50;

        // Centralização aproximada
        if (linha.centralizado) {

            const larguraEstimada =
                texto.length *
                tamanho *
                0.5;

            x =
                (595 - larguraEstimada) /
                2;
        }

        conteudo +=
            `BT /${fonte} ${tamanho} Tf ${x.toFixed(
                2
            )} ${y.toFixed(
                2
            )} Td (${texto}) Tj ET\n`;

        if (tamanho >= 16) {
            y -= 26;

        } else if (tamanho >= 12) {
            y -= 20;

        } else {
            y -= 16;
        }

        // Evita coordenada negativa
        if (y < 50) {
            y = 50;
        }
    });

    // ========================================================
    // OBJETOS DO PDF
    // ========================================================

    adicionarObjeto(
        "<< /Type /Catalog /Pages 2 0 R >>"
    );

    adicionarObjeto(
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"
    );

    adicionarObjeto(
        "<< /Type /Page /Parent 2 0 R " +
        "/MediaBox [0 0 595 842] " +
        "/Resources << " +
        "/Font << " +
        "/Helvetica 4 0 R " +
        "/Helvetica-Bold 5 0 R " +
        ">> " +
        ">> " +
        "/Contents 6 0 R >>"
    );

    adicionarObjeto(
        "<< /Type /Font " +
        "/Subtype /Type1 " +
        "/BaseFont /Helvetica " +
        "/Encoding /WinAnsiEncoding >>"
    );

    adicionarObjeto(
        "<< /Type /Font " +
        "/Subtype /Type1 " +
        "/BaseFont /Helvetica-Bold " +
        "/Encoding /WinAnsiEncoding >>"
    );

    const stream =
        `q
1 1 1 rg
0 0 595 842 re
f
Q
${conteudo}`;

    adicionarObjeto(
        `<< /Length ${Buffer.byteLength(
            stream,
            "latin1"
        )} >>
stream
${stream}
endstream`
    );

    // ========================================================
    // MONTA ARQUIVO PDF
    // ========================================================

    let pdf = "%PDF-1.4\n";

    const offsets = [0];

    for (
        let i = 0;
        i < objetos.length;
        i++
    ) {

        offsets[i + 1] =
            Buffer.byteLength(
                pdf,
                "latin1"
            );

        pdf +=
            `${i + 1} 0 obj\n`;

        pdf += objetos[i];

        pdf +=
            "\nendobj\n";
    }

    const xref =
        Buffer.byteLength(
            pdf,
            "latin1"
        );

    pdf +=
        `xref
0 ${objetos.length + 1}
0000000000 65535 f 
`;

    for (
        let i = 1;
        i <= objetos.length;
        i++
    ) {

        pdf +=
            String(
                offsets[i]
            ).padStart(
                10,
                "0"
            ) +
            " 00000 n \n";
    }

    pdf +=
        `trailer
<< /Size ${objetos.length + 1} /Root 1 0 R >>
startxref
${xref}
%%EOF`;

    return Buffer.from(
        pdf,
        "latin1"
    );
}

// ============================================================
// ALTA MÉDICA
// ============================================================

app.post("/alta-paciente", (req, res) => {

    try {

        // ----------------------------------------------------
        // DADOS RECEBIDOS DO FRONTEND
        // ----------------------------------------------------

        const pacienteId =
            req.body.pacienteId;

        const nomePaciente =
            req.body.paciente ||
            req.body.nome;

        const diagnostico =
            req.body.diagnostico;

        const condicao =
            req.body.condicao ||
            req.body.condicaoAlta;

        const resumo =
            req.body.resumo ||
            req.body.obs ||
            req.body.observacoes;

        const medicamentos =
            req.body.medicamentos ||
            req.body.medicacao;

        const orientacoes =
            req.body.orientacoes;

        const retorno =
            req.body.retorno;

        const medico =
            req.body.medico ||
            req.body.medicoResponsavel;

        // ----------------------------------------------------
        // VALIDAÇÕES
        // ----------------------------------------------------

        if (
            !pacienteId &&
            !nomePaciente
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Selecione um paciente antes de conceder a alta."
            });
        }

        if (!diagnostico) {

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Informe o diagnóstico final."
            });
        }

        if (!condicao) {

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Informe a condição do paciente na alta."
            });
        }

        // ----------------------------------------------------
        // LOCALIZAR PACIENTE
        // ----------------------------------------------------

        let paciente = null;

        if (pacienteId) {

            paciente =
                db.pacientes.find(
                    (p) =>
                        String(p.id) ===
                        String(pacienteId)
                );
        }

        if (
            !paciente &&
            nomePaciente
        ) {

            const nomeBusca =
                normalizarTexto(
                    nomePaciente
                );

            paciente =
                db.pacientes
                    .slice()
                    .reverse()
                    .find(
                        (p) =>
                            normalizarTexto(
                                p.nome ||
                                p.nomeCompleto
                            ) === nomeBusca
                    );
        }

        if (!paciente) {

            return res.status(404).json({
                sucesso: false,
                mensagem:
                    "Paciente não encontrado no sistema."
            });
        }

        // ----------------------------------------------------
        // VERIFICAR SE JÁ POSSUI ALTA
        // ----------------------------------------------------

        const altaExistente =
            db.altas.find(
                (alta) =>
                    String(
                        alta.pacienteId
                    ) ===
                        String(
                            paciente.id
                        ) &&
                    alta.status === "alta"
            );

        if (altaExistente) {

            return res.status(409).json({
                sucesso: false,
                mensagem:
                    "Este paciente já possui uma alta registrada."
            });
        }

        // ----------------------------------------------------
        // DATA E HORA
        // ----------------------------------------------------

        const agora =
            new Date();

        const data =
            agora.toLocaleDateString(
                "pt-BR"
            );

        const hora =
            agora.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        const iso =
            agora.toISOString();

        // ----------------------------------------------------
        // REGISTRAR CONSULTA FINAL
        // ----------------------------------------------------

        const consulta = {

            id: gerarId("CON"),

            pacienteId:
                paciente.id,

            paciente:
                paciente.nome ||
                paciente.nomeCompleto ||
                "",

            diagnostico:
                diagnostico,

            medicacao:
                medicamentos ||
                "Nenhuma",

            obs:
                resumo ||
                "Nenhuma",

            medico:
                medico ||
                "",

            createdAt:
                iso,

            status:
                "finalizada"
        };

        db.consultas.push(
            consulta
        );

        // ----------------------------------------------------
        // REGISTRAR ALTA
        // ----------------------------------------------------

        const alta = {

            id: gerarId("ALT"),

            pacienteId:
                paciente.id,

            paciente:
                paciente.nome ||
                paciente.nomeCompleto ||
                "",

            cpf:
                paciente.cpf ||
                "",

            mae:
                paciente.mae ||
                "",

            nascimento:
                paciente.nascimento ||
                "",

            estadoCivil:
                paciente.estadoCivil ||
                "",

            telefone:
                paciente.telefone ||
                "",

            email:
                paciente.email ||
                "",

            endereco:
                paciente.endereco ||
                "",

            contatoEmergencia:
                paciente.contatoEmergencia ||
                paciente.emergencia ||
                "",

            diagnostico:
                diagnostico,

            condicao:
                condicao,

            resumo:
                resumo ||
                "",

            medicacao:
                medicamentos ||
                "",

            medicamentos:
                medicamentos ||
                "",

            orientacoes:
                orientacoes ||
                "",

            retorno:
                retorno ||
                "",

            medico:
                medico ||
                "",

            medicoResponsavel:
                medico ||
                "",

            observacoes:
                resumo ||
                "",

            consultaId:
                consulta.id,

            data:
                data,

            hora:
                hora,

            createdAt:
                iso,

            status:
                "alta"
        };

        db.altas.push(
            alta
        );

        // ----------------------------------------------------
        // ATUALIZAR STATUS DO PACIENTE
        // ----------------------------------------------------

        const pacienteIndex =
            db.pacientes.findIndex(
                (p) =>
                    String(p.id) ===
                    String(paciente.id)
            );

        if (
            pacienteIndex !== -1
        ) {

            db.pacientes[
                pacienteIndex
            ].status = "alta";

            db.pacientes[
                pacienteIndex
            ].altaEm = iso;
        }

        // ----------------------------------------------------
        // REMOVER PACIENTE DA TRIAGEM
        // ----------------------------------------------------

        db.triagens =
            db.triagens.filter(
                (triagem) => {

                    const mesmoPaciente =
                        String(
                            triagem.pacienteId ||
                            ""
                        ) ===
                        String(
                            paciente.id
                        );

                    const mesmoNome =
                        normalizarTexto(
                            triagem.paciente
                        ) ===
                        normalizarTexto(
                            paciente.nome ||
                            paciente.nomeCompleto
                        );

                    return !(
                        (mesmoPaciente ||
                            mesmoNome) &&
                        (
                            triagem.status ===
                                "aguardando" ||
                            triagem.status ===
                                "aguardando_medico"
                        )
                    );
                }
            );

        // ----------------------------------------------------
        // SALVAR
        // ----------------------------------------------------

        const salvo =
            salvarDB();

        if (!salvo) {

            return res.status(500).json({
                sucesso: false,
                mensagem:
                    "A alta foi processada, mas não foi possível salvar o banco de dados."
            });
        }

        // ----------------------------------------------------
        // RESPOSTA
        // ----------------------------------------------------

        return res.status(201).json({

            sucesso: true,

            mensagem:
                "Alta médica registrada com sucesso.",

            alta: alta
        });

    } catch (erro) {

        console.error(
            "Erro ao realizar alta:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            mensagem:
                "Erro interno ao realizar a alta do paciente.",

            erro:
                erro.message
        });
    }
});

// ============================================================
// LISTAR ALTAS
// ============================================================

app.get("/altas", (req, res) => {

    try {

        const altas =
            [...db.altas]
                .reverse();

        res.json(
            altas
        );

    } catch (erro) {

        console.error(
            "Erro ao buscar altas:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem:
                "Erro ao buscar histórico de altas."
        });
    }
});

// ============================================================
// BUSCAR ALTA POR ID
// ============================================================

app.get("/alta/:id", (req, res) => {

    try {

        const alta =
            db.altas.find(
                (a) =>
                    String(a.id) ===
                    String(req.params.id)
            );

        if (!alta) {

            return res.status(404).json({
                sucesso: false,
                mensagem:
                    "Alta não encontrada."
            });
        }

        res.json(
            alta
        );

    } catch (erro) {

        console.error(
            "Erro ao buscar alta:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem:
                "Erro ao buscar alta."
        });
    }
});

// ============================================================
// GERAR PDF DA ALTA PELO ID
// ============================================================

app.get("/alta/:id/pdf", (req, res) => {

    try {

        const alta =
            db.altas.find(
                (a) =>
                    String(a.id) ===
                    String(req.params.id)
            );

        if (!alta) {

            return res.status(404).json({
                sucesso: false,
                mensagem:
                    "Alta não encontrada."
            });
        }

        const pdf =
            gerarPDFAlta(
                alta
            );

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `inline; filename="alta-${alta.pacienteId}.pdf"`
        );

        res.setHeader(
            "Content-Length",
            pdf.length
        );

        res.end(
            pdf
        );

    } catch (erro) {

        console.error(
            "Erro ao gerar PDF:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem:
                "Erro ao gerar PDF da alta."
        });
    }
});

// ============================================================
// EXCLUIR ALTA
// ============================================================

app.delete("/alta/:id", (req, res) => {

    try {

        const index =
            db.altas.findIndex(
                (a) =>
                    String(a.id) ===
                    String(req.params.id)
            );

        if (index === -1) {

            return res.status(404).json({
                sucesso: false,
                mensagem:
                    "Alta não encontrada."
            });
        }

        const alta =
            db.altas[index];

        db.altas.splice(
            index,
            1
        );

        // Caso a alta seja excluída,
        // o paciente volta para o status aguardando
        const paciente =
            db.pacientes.find(
                (p) =>
                    String(p.id) ===
                    String(
                        alta.pacienteId
                    )
            );

        if (paciente) {

            paciente.status =
                "aguardando";

            delete paciente.altaEm;
        }

        salvarDB();

        res.json({
            sucesso: true,
            mensagem:
                "Alta excluída com sucesso."
        });

    } catch (erro) {

        console.error(
            "Erro ao excluir alta:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem:
                "Erro ao excluir alta."
        });
    }
});

// ============================================================
// HISTÓRICO GERAL
// ============================================================

app.get("/historico", (req, res) => {

    try {

        const historico = {

            pacientes:
                [...db.pacientes]
                    .reverse(),

            triagens:
                [...db.triagens]
                    .reverse(),

            consultas:
                [...db.consultas]
                    .reverse(),

            altas:
                [...db.altas]
                    .reverse(),

            tv:
                [...db.tv_historico]
                    .reverse()
        };

        res.json(
            historico
        );

    } catch (erro) {

        console.error(
            "Erro ao buscar histórico:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem:
                "Erro ao buscar histórico."
        });
    }
});

// ============================================================
// STATUS DO SISTEMA
// ============================================================

app.get("/status", (req, res) => {

    res.json({

        sistema:
            "MEDCORE",

        status:
            "online",

        porta:
            PORT,

        data:
            dataAtualISO(),

        banco: {

            pacientes:
                db.pacientes.length,

            triagens:
                db.triagens.length,

            consultas:
                db.consultas.length,

            altas:
                db.altas.length
        }
    });
});

// ============================================================
// TRATAMENTO DE ROTAS NÃO ENCONTRADAS
// ============================================================

app.use((req, res) => {

    res.status(404).json({

        sucesso: false,

        mensagem:
            "Rota não encontrada.",

        rota:
            req.originalUrl
    });
});

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================

app.use(
    (erro, req, res, next) => {

        console.error(
            "Erro interno do servidor:",
            erro
        );

        res.status(500).json({

            sucesso: false,

            mensagem:
                "Erro interno do servidor.",

            erro:
                erro.message
        });
    }
);

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================================"
        );

        console.log(
            "        MEDCORE — SISTEMA HOSPITALAR"
        );

        console.log(
            "================================================"
        );

        console.log(
            `Servidor rodando na porta ${PORT}`
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "================================================"
        );
    }
);
