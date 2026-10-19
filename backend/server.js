
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MEDCORE — CONFIGURAÇÃO
// ============================================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Aceita tanto frontend/ ao lado de backend/ quanto
// backend/frontend/, caso essa seja a estrutura do projeto.
const FRONTEND_CANDIDATOS = [
  path.resolve(__dirname, "../frontend"),
  path.resolve(__dirname, "frontend"),
  path.resolve(process.cwd(), "frontend")
];

const FRONTEND_PATH =
  FRONTEND_CANDIDATOS.find(p =>
    fs.existsSync(path.join(p, "index.html"))
  ) || FRONTEND_CANDIDATOS[0];

const DB_PATH = path.join(__dirname, "db.json");

console.log("MEDCORE iniciando...");
console.log("Backend:", __dirname);
console.log("Frontend:", FRONTEND_PATH);
console.log("Banco de dados:", DB_PATH);

// ============================================================
// BANCO JSON
// ============================================================

function bancoInicial() {
  return {
    usuarios: [],
    pacientes: [],
    triagens: [],
    consultas: [],
    altas: [],
    medicacoes: [],
    tv_chamada: [],
    tv_historico: [],
    altas_historico: []
  };
}

function carregarDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(
        DB_PATH,
        JSON.stringify(bancoInicial(), null, 2),
        "utf8"
      );
    }

    const dados = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    const base = bancoInicial();

    for (const chave of Object.keys(base)) {
      if (!Array.isArray(dados[chave])) {
        dados[chave] = base[chave];
      }
    }

    return dados;
  } catch (erro) {
    console.error("Erro ao carregar db.json:", erro);
    return bancoInicial();
  }
}

let db = carregarDB();

function salvarDB() {
  const temporario = DB_PATH + ".tmp";

  fs.writeFileSync(
    temporario,
    JSON.stringify(db, null, 2),
    "utf8"
  );

  fs.renameSync(temporario, DB_PATH);
}

function gerarId(prefixo = "REG") {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function encontrarPacientePorId(id) {
  if (id === undefined || id === null || id === "") return null;

  return db.pacientes.find(p =>
    String(p.id) === String(id) ||
    String(p.pacienteId) === String(id)
  ) || null;
}

function nomePaciente(paciente) {
  return paciente?.nome ||
    paciente?.nomeCompleto ||
    paciente?.paciente ||
    "";
}

// ============================================================
// FRONTEND — CORREÇÃO DO ERRO ENOENT
// ============================================================

app.use(express.static(FRONTEND_PATH));

app.get("/", (req, res) => {
  const indexPath = path.join(FRONTEND_PATH, "index.html");

  if (!fs.existsSync(indexPath)) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "index.html não encontrado.",
      frontendConfigurado: FRONTEND_PATH,
      dica: "Confira a estrutura das pastas e o caminho do frontend."
    });
  }

  res.sendFile(indexPath);
});

// ============================================================
// STATUS DO SERVIDOR
// ============================================================

app.get("/status", (req, res) => {
  res.json({
    sucesso: true,
    sistema: "MEDCORE",
    servidor: "online",
    frontendEncontrado: fs.existsSync(
      path.join(FRONTEND_PATH, "index.html")
    )
  });
});

// ============================================================
// LOGIN
// ============================================================

app.post("/login", (req, res) => {
  const usuario = String(req.body.usuario || req.body.email || "").trim();
  const senha = String(req.body.senha || req.body.password || "");

  const encontrado = db.usuarios.find(u =>
    String(u.usuario || u.email || u.login || "") === usuario &&
    String(u.senha || u.password || "") === senha
  );

  if (!encontrado) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Usuário ou senha inválidos."
    });
  }

  res.json({
    sucesso: true,
    mensagem: "Login realizado.",
    usuario: {
      id: encontrado.id,
      nome: encontrado.nome || encontrado.usuario || encontrado.email,
      perfil: encontrado.perfil || encontrado.tipo || "usuario"
    }
  });
});

// ============================================================
// PACIENTES
// ============================================================

app.get("/pacientes", (req, res) => {
  const busca = normalizar(req.query.busca || "");

  if (!busca) {
    return res.json(db.pacientes);
  }

  const encontrados = db.pacientes.filter(p => {
    const campos = [
      p.id,
      p.pacienteId,
      p.nome,
      p.nomeCompleto,
      p.cpf
    ];

    return campos.some(c => normalizar(c).includes(busca));
  });

  res.json(encontrados);
});

app.get("/pacientes/:id", (req, res) => {
  const paciente = encontrarPacientePorId(req.params.id);

  if (!paciente) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Paciente não encontrado."
    });
  }

  res.json(paciente);
});

// ============================================================
// CADASTRO DE PACIENTE / ATENDIMENTO
// ============================================================

app.post("/atendimento", (req, res) => {
  const corpo = req.body;
  const nome = corpo.nome || corpo.nomeCompleto || corpo.paciente;

  if (!nome) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "O nome do paciente é obrigatório."
    });
  }

  const paciente = {
    id: corpo.id || gerarId("PAC"),
    nome: String(nome).trim(),
    cpf: corpo.cpf || "",
    nascimento: corpo.nascimento || corpo.dataNascimento || "",
    telefone: corpo.telefone || "",
    email: corpo.email || "",
    endereco: corpo.endereco || "",
    mae: corpo.mae || corpo.nomeMae || "",
    estadoCivil: corpo.estadoCivil || "",
    contatoEmergencia: corpo.contatoEmergencia || "",
    dataEntrada: corpo.dataEntrada || new Date().toISOString().slice(0, 10),
    status: "aguardando",
    createdAt: new Date().toISOString()
  };

  db.pacientes.push(paciente);
  salvarDB();

  res.status(201).json({
    sucesso: true,
    mensagem: "Paciente cadastrado.",
    paciente
  });
});

// ============================================================
// TRIAGEM
// ============================================================

app.get("/triagens", (req, res) => {
  res.json(db.triagens);
});

app.post("/triagem", (req, res) => {
  const corpo = req.body;

  const nome = corpo.nome || corpo.nomeCompleto || corpo.paciente;

  if (!nome) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Informe o nome do paciente."
    });
  }

  let paciente = corpo.pacienteId
    ? encontrarPacientePorId(corpo.pacienteId)
    : null;

  if (!paciente) {
    paciente = db.pacientes.find(p =>
      normalizar(nomePaciente(p)) === normalizar(nome) &&
      p.status !== "alta"
    );
  }

  if (!paciente) {
    paciente = {
      id: gerarId("PAC"),
      nome: String(nome).trim(),
      cpf: corpo.cpf || "",
      nascimento: corpo.nascimento || "",
      dataEntrada: new Date().toISOString().slice(0, 10),
      status: "aguardando",
      createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);
  }

  const triagem = {
    id: gerarId("TRI"),
    pacienteId: paciente.id,
    nome: nomePaciente(paciente),
    sintoma: corpo.sintoma || corpo.sintomas || "",
    temperatura: corpo.temperatura || "",
    risco: corpo.risco || corpo.classificacao || "verde",
    alergia: corpo.alergia || "Nenhuma",
    observacao: corpo.observacao || corpo.obs || "",
    data: new Date().toISOString(),
    status: "aguardando"
  };

  paciente.status = "aguardando";
  db.triagens.push(triagem);
  salvarDB();

  res.status(201).json({
    sucesso: true,
    mensagem: "Triagem registrada.",
    triagem
  });
});

// ============================================================
// MEDICAÇÕES
// ============================================================

app.get("/lista-medicacoes", (req, res) => {
  const nomes = db.medicacoes.map(m =>
    typeof m === "string" ? m : m.nome
  ).filter(Boolean);

  res.json(nomes);
});

app.post("/medicacoes", (req, res) => {
  const nome = String(req.body.nome || req.body.medicacao || "").trim();

  if (!nome) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Informe o nome da medicação."
    });
  }

  const existe = db.medicacoes.some(m =>
    normalizar(typeof m === "string" ? m : m.nome) === normalizar(nome)
  );

  if (!existe) {
    db.medicacoes.push(nome);
    salvarDB();
  }

  res.status(201).json({
    sucesso: true,
    mensagem: "Medicação registrada.",
    medicacao: nome
  });
});

// ============================================================
// CONSULTAS
// ============================================================

app.get("/consultas", (req, res) => {
  res.json(db.consultas);
});

app.post("/consulta", (req, res) => {
  const corpo = req.body;
  const pacienteNome = corpo.paciente || corpo.nome;

  if (!pacienteNome || !corpo.diagnostico) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Paciente e diagnóstico são obrigatórios."
    });
  }

  const paciente = corpo.pacienteId
    ? encontrarPacientePorId(corpo.pacienteId)
    : db.pacientes.find(p =>
        normalizar(nomePaciente(p)) === normalizar(pacienteNome)
      );

  const consulta = {
    id: gerarId("CON"),
    pacienteId: paciente?.id || corpo.pacienteId || null,
    paciente: paciente ? nomePaciente(paciente) : pacienteNome,
    diagnostico: corpo.diagnostico,
    medicacao: corpo.medicacao || corpo.medicamentos || "",
    obs: corpo.obs || corpo.observacoes || "",
    medico: corpo.medico || corpo.medicoResponsavel || "",
    data: new Date().toISOString(),
    status: "registrada"
  };

  db.consultas.push(consulta);
  salvarDB();

  res.status(201).json({
    sucesso: true,
    mensagem: "Consulta salva com sucesso.",
    consulta
  });
});

// ============================================================
// CHAMADA NA TV
// ============================================================

app.post("/tv/chamar", (req, res) => {
  const corpo = req.body;
  const paciente = corpo.paciente || corpo.nome;

  if (!paciente) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Informe o nome do paciente."
    });
  }

  const chamada = {
    id: gerarId("TV"),
    paciente,
    localTipo: corpo.localTipo || "CONSULTÓRIO",
    localNumero: corpo.localNumero || "01",
    data: new Date().toISOString()
  };

  db.tv_chamada.push(chamada);
  db.tv_historico.push(chamada);

  // Mantém somente a chamada atual e o histórico.
  if (db.tv_chamada.length > 1) {
    db.tv_chamada = [chamada];
  }

  salvarDB();

  res.json({
    sucesso: true,
    mensagem: "Paciente chamado na TV.",
    chamada
  });
});

app.get("/tv/chamada", (req, res) => {
  res.json(db.tv_chamada[db.tv_chamada.length - 1] || null);
});

app.get("/tv/historico", (req, res) => {
  res.json(db.tv_historico);
});

app.delete("/tv/chamada", (req, res) => {
  db.tv_chamada = [];
  salvarDB();

  res.json({
    sucesso: true,
    mensagem: "Chamada atual removida."
  });
});

// ============================================================
// ALTA MÉDICA
// Compatível com alta.html: POST /altas e POST /alta-paciente
// ============================================================

function registrarAlta(req, res) {
  const corpo = req.body;

  const idInformado = corpo.pacienteId || corpo.idPaciente;
  const nomeInformado = String(
    corpo.paciente || corpo.nome || corpo.nomePaciente || ""
  ).trim();

  if (!nomeInformado) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Selecione um paciente."
    });
  }

  if (!corpo.diagnostico || !String(corpo.diagnostico).trim()) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Informe o diagnóstico final."
    });
  }

  if (!corpo.condicao && !corpo.condicaoAlta) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Informe a condição do paciente na alta."
    });
  }

  let paciente = idInformado
    ? encontrarPacientePorId(idInformado)
    : null;

  if (!paciente) {
    paciente = db.pacientes.find(p =>
      normalizar(nomePaciente(p)) === normalizar(nomeInformado)
    );
  }

  // Se o cadastro não estiver na lista, cria um registro básico
  // para não perder a alta enviada pela página.
  if (!paciente) {
    paciente = {
      id: idInformado || gerarId("PAC"),
      nome: nomeInformado,
      cpf: corpo.cpf || "",
      nascimento: corpo.nascimento || "",
      dataEntrada: corpo.dataEntrada || "",
      status: "alta"
    };

    db.pacientes.push(paciente);
  }

  const agora = new Date();
  const dataISO = agora.toISOString();

  const alta = {
    id: gerarId("ALT"),
    pacienteId: paciente.id,
    paciente: nomePaciente(paciente) || nomeInformado,
    cpf: corpo.cpf || paciente.cpf || "",
    nascimento: corpo.nascimento || paciente.nascimento || "",
    dataEntrada: corpo.dataEntrada || paciente.dataEntrada || "",
    diagnostico: String(corpo.diagnostico).trim(),
    condicao: corpo.condicao || corpo.condicaoAlta,
    resumo: corpo.resumo || "",
    medicamentos: corpo.medicamentos || corpo.medicacao || "",
    medicacao: corpo.medicamentos || corpo.medicacao || "",
    orientacoes: corpo.orientacoes || "",
    retorno: corpo.retorno || "",
    medico: corpo.medico || corpo.medicoResponsavel || "",
    medicoResponsavel: corpo.medicoResponsavel || corpo.medico || "",
    data: dataISO,
    dataAlta: dataISO,
    hora: agora.toLocaleTimeString("pt-BR"),
    createdAt: dataISO,
    status: "alta"
  };

  db.altas.push(alta);
  db.altas_historico.push(alta);

  paciente.status = "alta";
  paciente.altaEm = dataISO;

  // Retira da fila de triagem o paciente que recebeu alta.
  db.triagens = db.triagens.filter(t =>
    String(t.pacienteId || "") !== String(paciente.id) &&
    normalizar(t.nome) !== normalizar(nomePaciente(paciente))
  );

  salvarDB();

  return res.status(201).json({
    sucesso: true,
    mensagem: "Alta registrada com sucesso.",
    alta
  });
}

app.post("/altas", registrarAlta);
app.post("/alta-paciente", registrarAlta);

app.get("/altas", (req, res) => {
  res.json(db.altas);
});

app.get("/alta/:id", (req, res) => {
  const alta = db.altas.find(a =>
    String(a.id) === String(req.params.id)
  );

  if (!alta) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Registro de alta não encontrado."
    });
  }

  res.json(alta);
});

// ============================================================
// PDF DA ALTA — opcional, usando pdfkit se estiver instalado
// ============================================================

app.get("/alta/:id/pdf", (req, res) => {
  const alta = db.altas.find(a =>
    String(a.id) === String(req.params.id)
  );

  if (!alta) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Registro de alta não encontrado."
    });
  }

  let PDFDocument;

  try {
    PDFDocument = require("pdfkit");
  } catch {
    return res.status(500).json({
      sucesso: false,
      mensagem: "A biblioteca pdfkit não está instalada."
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="alta-${alta.id}.pdf"`
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text("MEDCORE", { align: "center" });
  doc.moveDown();
  doc.fontSize(16).text("TERMO DE ALTA MÉDICA", { align: "center" });
  doc.moveDown(2);

  const campos = [
    ["Paciente", alta.paciente],
    ["CPF", alta.cpf],
    ["Data de entrada", alta.dataEntrada],
    ["Data da alta", alta.dataAlta || alta.data],
    ["Diagnóstico", alta.diagnostico],
    ["Condição na alta", alta.condicao],
    ["Resumo do atendimento", alta.resumo],
    ["Medicamentos / prescrições", alta.medicamentos],
    ["Orientações", alta.orientacoes],
    ["Retorno / acompanhamento", alta.retorno],
    ["Médico responsável", alta.medicoResponsavel || alta.medico]
  ];

  for (const [titulo, valor] of campos) {
    doc.fontSize(11).font("Helvetica-Bold").text(`${titulo}:`);
    doc.font("Helvetica").text(String(valor || "Não informado"));
    doc.moveDown(0.6);
  }

  doc.moveDown();
  doc.fontSize(10).text(
    "Documento gerado pelo sistema MEDCORE.",
    { align: "center" }
  );

  doc.end();
});

// ============================================================
// HISTÓRICO GERAL
// ============================================================

app.get("/historico", (req, res) => {
  res.json({
    consultas: db.consultas,
    altas: db.altas,
    triagens: db.triagens,
    chamadasTV: db.tv_historico
  });
});

// ============================================================
// 404 E ERROS
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: "Rota não encontrada.",
    rota: req.originalUrl
  });
});

app.use((erro, req, res, next) => {
  console.error("Erro interno:", erro);

  if (res.headersSent) {
    return next(erro);
  }

  res.status(500).json({
    sucesso: false,
    mensagem: "Erro interno do servidor.",
    erro: process.env.NODE_ENV === "production"
      ? undefined
      : erro.message
  });
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MEDCORE rodando na porta ${PORT}`);
});
