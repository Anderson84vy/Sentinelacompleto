
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// CONFIGURAÇÕES
// =====================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Frontend do MEDCORE
app.use(express.static(path.join(__dirname, "../frontend")));

// =====================================================
// BANCO DE DADOS
// =====================================================

const DB_FILE = path.join(__dirname, "db.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const inicial = {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      altas: [],
      tv_chamada: null,
      tv_historico: []
    };

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(inicial, null, 2),
      "utf8"
    );

    return inicial;
  }

  let db;

  try {
    db = JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );
  } catch (erro) {
    console.error("Erro ao ler db.json:", erro);
    throw new Error("O arquivo db.json está inválido.");
  }

  if (!Array.isArray(db.usuarios)) db.usuarios = [];
  if (!Array.isArray(db.pacientes)) db.pacientes = [];
  if (!Array.isArray(db.triagens)) db.triagens = [];
  if (!Array.isArray(db.consultas)) db.consultas = [];
  if (!Array.isArray(db.altas)) db.altas = [];

  if (typeof db.tv_chamada === "undefined") {
    db.tv_chamada = null;
  }

  if (!Array.isArray(db.tv_historico)) {
    db.tv_historico = [];
  }

  return db;
}

function writeDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2),
    "utf8"
  );
}

function gerarId(prefixo = "") {
  return prefixo + Date.now() +
    Math.floor(Math.random() * 1000);
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {
  try {
    const db = readDB();
    const { usuario, senha } = req.body;

    const encontrado = db.usuarios.find(u =>
      u.usuario === usuario &&
      u.senha === senha
    );

    if (!encontrado) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Usuário ou senha inválidos."
      });
    }

    res.json(encontrado);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao realizar login."
    });
  }
});

// =====================================================
// CADASTRO DE PACIENTES
// =====================================================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),
      nome: req.body.nome || req.body.nomeCompleto,
      cpf: req.body.cpf || "",
      mae: req.body.mae || "",
      nascimento: req.body.nascimento || "",
      estadoCivil: req.body.estadoCivil || "",
      telefone: req.body.telefone || "",
      email: req.body.email || "",
      emergencia: req.body.emergencia || "",
      endereco: req.body.endereco || "",
      tipo: req.body.tipo || "",
      status: "triagem",
      createdAt: new Date().toISOString()
    };

    if (!paciente.nome) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o nome do paciente."
      });
    }

    db.pacientes.push(paciente);
    writeDB(db);

    res.status(201).json({
      sucesso: true,
      mensagem: "Paciente cadastrado com sucesso.",
      paciente
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao cadastrar paciente."
    });
  }
});

// =====================================================
// LISTAR E BUSCAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {
  try {
    const db = readDB();
    const busca = normalizarTexto(req.query.busca);

    let pacientes = db.pacientes;

    if (busca) {
      pacientes = pacientes.filter(p =>
        normalizarTexto(p.nome).includes(busca) ||
        normalizarTexto(p.cpf).includes(busca) ||
        String(p.id).includes(busca)
      );
    }

    res.json(pacientes);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao buscar pacientes."
    });
  }
});

// =====================================================
// REGISTRAR TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    const temperatura =
      req.body.temperatura === "" ||
      req.body.temperatura === undefined ||
      req.body.temperatura === null
        ? null
        : Number(req.body.temperatura);

    let risco = req.body.risco || "verde";

    if (temperatura !== null && !Number.isNaN(temperatura)) {
      if (temperatura >= 39) {
        risco = "vermelho";
      } else if (temperatura >= 38) {
        risco = "amarelo";
      }
    }

    const triagem = {
      id: Date.now(),
      pacienteId: req.body.pacienteId || null,
      nome: req.body.nome || "",
      sintoma: req.body.sintoma || "",
      temperatura,
      alergia: req.body.alergia || "",
      observacao: req.body.observacao || "",
      risco,
      status: "aguardando_medico",
      createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);

    const paciente = db.pacientes.find(p =>
      triagem.pacienteId
        ? String(p.id) === String(triagem.pacienteId)
        : normalizarTexto(p.nome) ===
          normalizarTexto(triagem.nome)
    );

    if (paciente) {
      paciente.status = "aguardando_medico";
    }

    writeDB(db);

    res.status(201).json({
      sucesso: true,
      mensagem: "Triagem registrada.",
      triagem
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao registrar triagem."
    });
  }
});

// =====================================================
// LISTAR TRIAGENS PENDENTES
// =====================================================

app.get("/triagens", (req, res) => {
  try {
    const db = readDB();

    res.json(
      db.triagens.filter(t =>
        t.status === "aguardando_medico"
      )
    );
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao listar triagens."
    });
  }
});

// =====================================================
// CHAMADA DE PACIENTE NA TV
// =====================================================

app.post("/tv/chamar", (req, res) => {
  try {
    const db = readDB();

    const chamada = {
      id: String(Date.now()),
      localTipo: req.body.localTipo || "Consultório",
      localNumero: req.body.localNumero || "01",
      paciente: req.body.paciente || "",
      hora: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    db.tv_chamada = chamada;
    db.tv_historico.unshift(chamada);

    db.tv_historico = db.tv_historico.slice(0, 5);

    writeDB(db);

    res.json({
      sucesso: true,
      chamada
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao chamar paciente."
    });
  }
});

// =====================================================
// CONSULTAR CHAMADA DA TV
// =====================================================

app.get("/tv/chamada", (req, res) => {
  try {
    const db = readDB();

    res.json({
      chamada: db.tv_chamada,
      historico: db.tv_historico
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao consultar chamadas."
    });
  }
});

// =====================================================
// MEDICAÇÕES
// =====================================================

app.get("/lista-medicacoes", (req, res) => {
  res.json([
    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"
  ]);
});

// =====================================================
// REGISTRAR CONSULTA
// =====================================================

app.post("/consulta", (req, res) => {
  try {
    const db = readDB();

    const consulta = {
      id: Date.now(),
      pacienteId: req.body.pacienteId || null,
      paciente: req.body.paciente || "",
      diagnostico: req.body.diagnostico || "",
      medicacao: req.body.medicacao || "",
      obs: req.body.obs || "",
      createdAt: new Date().toISOString(),
      status: "realizada"
    };

    if (!consulta.paciente) {
      return res.status(400).json({
        mensagem: "Informe o paciente da consulta."
      });
    }

    db.consultas.push(consulta);
    writeDB(db);

    res.status(201).json({
      sucesso: true,
      mensagem: "Consulta registrada.",
      consulta
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao registrar consulta."
    });
  }
});

// =====================================================
// LISTAR CONSULTAS / MEDICAÇÕES REGISTRADAS
// =====================================================

app.get("/medicacoes", (req, res) => {
  try {
    const db = readDB();
    res.json(db.consultas);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao listar medicações."
    });
  }
});

// =====================================================
// FUNÇÕES PARA O PDF
// =====================================================

function escaparPDF(texto) {
  return String(texto ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function removerAcentos(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function quebrarTexto(texto, tamanho = 85) {
  const palavras = removerAcentos(texto).split(/\s+/);
  const linhas = [];
  let linha = "";

  for (const palavra of palavras) {
    const tentativa = (linha + " " + palavra).trim();

    if (tentativa.length <= tamanho) {
      linha = tentativa;
    } else {
      if (linha) linhas.push(linha);
      linha = palavra;
    }
  }

  if (linha) linhas.push(linha);

  return linhas;
}

// =====================================================
// GERAR TERMO DE ALTA EM PDF
// =====================================================

function gerarPDFAlta(alta) {
  const objetos = [];

  function adicionarObjeto(conteudo) {
    objetos.push(conteudo);
    return objetos.length;
  }

  const linhas = [
    { texto: "MEDCORE", tamanho: 22, bold: true, centralizado: true },
    { texto: "SISTEMA HOSPITALAR", tamanho: 10, centralizado: true },
    { texto: "", tamanho: 10 },
    { texto: "TERMO DE ALTA MEDICA", tamanho: 16, bold: true, centralizado: true },
    { texto: "", tamanho: 10 },
    { texto: "DADOS DO PACIENTE", tamanho: 12, bold: true },
    { texto: "Nome completo: " + (alta.paciente || "Nao informado"), tamanho: 10 },
    { texto: "CPF: " + (alta.cpf || "Nao informado"), tamanho: 10 },
    { texto: "Data de nascimento: " + (alta.nascimento || "Nao informado"), tamanho: 10 },
    { texto: "Telefone: " + (alta.telefone || "Nao informado"), tamanho: 10 },
    { texto: "", tamanho: 10 },
    { texto: "DADOS DA ALTA", tamanho: 12, bold: true },
    { texto: "Diagnostico: " + (alta.diagnostico || "Nao informado"), tamanho: 10 },
    { texto: "Condicao na alta: " + (alta.condicao || "Nao informado"), tamanho: 10 },
    { texto: "Resumo: " + (alta.resumo || "Nao informado"), tamanho: 10 },
    { texto: "Medicamentos: " + (alta.medicacao || "Nao informado"), tamanho: 10 },
    { texto: "Orientacoes: " + (alta.orientacoes || "Nao informado"), tamanho: 10 },
    { texto: "Retorno: " + (alta.retorno || "Nao informado"), tamanho: 10 },
    { texto: "", tamanho: 10 },
    { texto: "Medico responsavel: " + (alta.medico || "Nao informado"), tamanho: 10 },
    { texto: "Data da alta: " + (alta.data || "Nao informada"), tamanho: 10 },
    { texto: "Hora da alta: " + (alta.hora || "Nao informada"), tamanho: 10 },
    { texto: "", tamanho: 10 },
    { texto: "Assinatura do medico: ______________________________", tamanho: 10 },
    { texto: "Assinatura do paciente/responsavel: __________________", tamanho: 10 }
  ];

  let conteudo = "";
  let y = 800;

  for (const item of linhas) {
    const partes = quebrarTexto(item.texto);

    for (const parte of partes) {
      const texto = escaparPDF(parte);
      const tamanho = item.tamanho || 10;
      const x = item.centralizado ? 150 : 50;

      conteudo +=
        `BT /${item.bold ? "Helvetica-Bold" : "Helvetica"} ` +
        `${tamanho} Tf ${x} ${y} Td (${texto}) Tj ET\n`;

      y -= tamanho >= 16 ? 26 : tamanho >= 12 ? 20 : 16;

      if (y < 50) y = 50;
    }
  }

  adicionarObjeto("<< /Type /Catalog /Pages 2 0 R >>");
  adicionarObjeto("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");

  adicionarObjeto(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
    "/Resources << /Font << /Helvetica 4 0 R /Helvetica-Bold 5 0 R >> >> " +
    "/Contents 6 0 R >>"
  );

  adicionarObjeto(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica " +
    "/Encoding /WinAnsiEncoding >>"
  );

  adicionarObjeto(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold " +
    "/Encoding /WinAnsiEncoding >>"
  );

  const stream = `q\n1 1 1 rg\n0 0 595 842 re\nf\nQ\n${conteudo}`;

  adicionarObjeto(
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\n` +
    `stream\n${stream}\nendstream`
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let i = 0; i < objetos.length; i++) {
    offsets[i + 1] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i + 1} 0 obj\n${objetos[i]}\nendobj\n`;
  }

  const xref = Buffer.byteLength(pdf, "latin1");

  pdf += `xref\n0 ${objetos.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objetos.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0");
    pdf += " 00000 n \n";
  }

  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xref}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

// =====================================================
// REGISTRAR ALTA MÉDICA
// =====================================================

app.post("/alta-paciente", (req, res) => {
  try {
    const db = readDB();

    const pacienteId = req.body.pacienteId;
    const nomePaciente = req.body.paciente || req.body.nome;
    const diagnostico = req.body.diagnostico;
    const condicao = req.body.condicao;

    const resumo = req.body.resumo || req.body.obs || "";
    const medicamentos = req.body.medicamentos || req.body.medicacao || "";
    const orientacoes = req.body.orientacoes || "";
    const retorno = req.body.retorno || "";
    const medico = req.body.medico || req.body.medicoResponsavel || "";

    if (!pacienteId && !nomePaciente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Selecione um paciente antes de conceder a alta."
      });
    }

    if (!diagnostico || !condicao) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o diagnóstico e a condição do paciente."
      });
    }

    let paciente = null;

    if (pacienteId) {
      paciente = db.pacientes.find(p =>
        String(p.id) === String(pacienteId)
      );
    }

    if (!paciente && nomePaciente) {
      paciente = db.pacientes.slice().reverse().find(p =>
        normalizarTexto(p.nome) === normalizarTexto(nomePaciente)
      );
    }

    if (!paciente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Paciente não encontrado no sistema."
      });
    }

    const existente = db.altas.find(a =>
      String(a.pacienteId) === String(paciente.id) &&
      a.status === "alta"
    );

    if (existente) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Este paciente já possui uma alta registrada."
      });
    }

    const agora = new Date();

    const consulta = {
      id: Date.now(),
      pacienteId: paciente.id,
      paciente: paciente.nome,
      diagnostico,
      medicacao: medicamentos || "Nenhuma",
      obs: resumo || "Nenhuma",
      createdAt: agora.toISOString(),
      status: "finalizada"
    };

    db.consultas.push(consulta);

    const alta = {
      id: Date.now() + 1,
      pacienteId: paciente.id,
      paciente: paciente.nome,
      cpf: paciente.cpf || "",
      mae: paciente.mae || "",
      nascimento: paciente.nascimento || "",
      estadoCivil: paciente.estadoCivil || "",
      telefone: paciente.telefone || "",
      email: paciente.email || "",
      endereco: paciente.endereco || "",
      diagnostico,
      condicao,
      resumo,
      medicacao: medicamentos,
      orientacoes,
      retorno,
      medico,
      consultaId: consulta.id,
      data: agora.toLocaleDateString("pt-BR"),
      hora: agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      createdAt: agora.toISOString(),
      status: "alta"
    };

    db.altas.push(alta);

    paciente.status = "alta";
    paciente.altaEm = agora.toISOString();

    db.triagens = db.triagens.filter(t => {
      const corresponde = t.pacienteId
        ? String(t.pacienteId) === String(paciente.id)
        : normalizarTexto(t.nome) === normalizarTexto(paciente.nome);

      return !(corresponde && t.status === "aguardando_medico");
    });

    writeDB(db);

    res.status(201).json({
      sucesso: true,
      mensagem: "Alta médica registrada com sucesso.",
      alta
    });
  } catch (erro) {
    console.error("Erro ao realizar alta:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao realizar a alta do paciente."
    });
  }
});

// =====================================================
// LISTAR ALTAS
// =====================================================

app.get("/altas", (req, res) => {
  try {
    const db = readDB();
    res.json(db.altas.slice().reverse());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao listar altas."
    });
  }
});

// =====================================================
// BUSCAR ALTA POR ID
// =====================================================

app.get("/alta/:id", (req, res) => {
  try {
    const db = readDB();

    const alta = db.altas.find(a =>
      String(a.id) === String(req.params.id)
    );

    if (!alta) {
      return res.status(404).json({
        mensagem: "Alta não encontrada."
      });
    }

    res.json(alta);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      mensagem: "Erro ao buscar alta."
    });
  }
});

// =====================================================
// GERAR PDF DA ALTA
// =====================================================

app.get("/alta/:id/pdf", (req, res) => {
  try {
    const db = readDB();

    const alta = db.altas.find(a =>
      String(a.id) === String(req.params.id)
    );

    if (!alta) {
      return res.status(404).json({
        mensagem: "Alta não encontrada."
      });
    }

    const pdf = gerarPDFAlta(alta);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `inline; filename="alta-${alta.pacienteId}.pdf"`
    );

    res.setHeader("Content-Length", pdf.length);

    res.end(pdf);
  } catch (erro) {
    console.error("Erro ao gerar PDF:", erro);

    res.status(500).json({
      mensagem: "Erro ao gerar PDF da alta."
    });
  }
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor MEDCORE rodando na porta ${PORT}`);
});
