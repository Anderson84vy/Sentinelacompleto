const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();


// =====================================================
// CONFIGURAÇÕES
// =====================================================

app.use(express.json());
app.use(cors());


// Permite acessar os arquivos do frontend
app.use(express.static(path.join(__dirname, "../frontend")));


// Banco de dados
const DB_FILE = path.join(__dirname, "db.json");


// =====================================================
// BANCO DE DADOS
// =====================================================

function readDB() {

  if (!fs.existsSync(DB_FILE)) {

    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      altas: [],
      tv_chamada: null,
      tv_historico: []
    };

  }


  const db = JSON.parse(
    fs.readFileSync(DB_FILE, "utf8")
  );


  // Garante que os campos existam
  if (!db.usuarios) db.usuarios = [];
  if (!db.pacientes) db.pacientes = [];
  if (!db.triagens) db.triagens = [];
  if (!db.consultas) db.consultas = [];
  if (!db.altas) db.altas = [];

  if (!db.tv_chamada)
    db.tv_chamada = null;

  if (!db.tv_historico)
    db.tv_historico = [];


  return db;

}


function writeDB(data) {

  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2)
  );

}


// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {

  const db = readDB();

  const usuario = req.body.usuario;
  const senha = req.body.senha;


  const user = db.usuarios.find(u =>
    u.usuario === usuario &&
    u.senha === senha
  );


  if (!user) {

    return res.status(401).json({
      mensagem: "Usuário ou senha inválidos."
    });

  }


  res.json(user);

});


// =====================================================
// ATENDIMENTO - CADASTRAR PACIENTE
// =====================================================

app.post("/atendimento", (req, res) => {

  const db = readDB();


  const paciente = {

    id: Date.now(),

    // Dados pessoais
    nome: req.body.nome,
    cpf: req.body.cpf,
    mae: req.body.mae,
    nascimento: req.body.nascimento,
    estadoCivil: req.body.estadoCivil,

    // Contato
    telefone: req.body.telefone,
    email: req.body.email,
    emergencia: req.body.emergencia,

    // Endereço
    endereco: req.body.endereco,

    // Convênio
    tipo: req.body.tipo,

    // Controle do sistema
    status: "triagem",

    createdAt: new Date().toISOString()

  };


  // Validação
  if (
    !paciente.nome ||
    !paciente.cpf ||
    !paciente.mae ||
    !paciente.nascimento ||
    !paciente.estadoCivil ||
    !paciente.telefone ||
    !paciente.emergencia ||
    !paciente.endereco ||
    !paciente.tipo
  ) {

    return res.status(400).json({

      mensagem:
        "Preencha todos os campos obrigatórios."

    });

  }


  // Salva paciente
  db.pacientes.push(paciente);

  writeDB(db);


  res.status(201).json({

    mensagem:
      "Paciente cadastrado com sucesso.",

    paciente: paciente

  });

});


// =====================================================
// LISTAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {

  const db = readDB();

  res.json(db.pacientes);

});


// =====================================================
// TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {

  const db = readDB();

  let risco = req.body.risco;


  // Classificação automática
  if (req.body.temperatura >= 39) {

    risco = "vermelho";

  }

  else if (req.body.temperatura >= 38) {

    risco = "amarelo";

  }

  else if (!risco) {

    risco = "verde";

  }


  const triagem = {

    id: Date.now(),

    nome: req.body.nome,

    sintoma: req.body.sintoma,

    temperatura: req.body.temperatura,

    alergia: req.body.alergia,

    observacao: req.body.observacao,

    risco: risco,

    status: "aguardando_medico",

    createdAt:
      new Date().toISOString()

  };


  db.triagens.push(triagem);

  writeDB(db);


  res.json(triagem);

});


// =====================================================
// LISTAR TRIAGENS
// =====================================================

app.get("/triagens", (req, res) => {

  const db = readDB();

  /*
    Somente pacientes aguardando atendimento
    aparecem no Painel Médico.
  */

  const triagensAguardando =
    db.triagens.filter(t =>
      t.status === "aguardando_medico"
    );


  res.json(triagensAguardando);

});


// =====================================================
// MÍDIA INDOOR - CHAMAR PACIENTE
// =====================================================

app.post("/tv/chamar", (req, res) => {

  const db = readDB();


  const chamada = {

    id:
      Date.now().toString(),

    localTipo:
      req.body.localTipo,

    localNumero:
      req.body.localNumero,

    paciente:
      req.body.paciente,

    hora:
      new Date().toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )

  };


  db.tv_chamada = chamada;


  db.tv_historico.unshift(
    chamada
  );


  if (
    db.tv_historico.length > 5
  ) {

    db.tv_historico.pop();

  }


  writeDB(db);


  res.json(chamada);

});


// =====================================================
// CONSULTAR CHAMADA ATUAL DA TV
// =====================================================

app.get("/tv/chamada", (req, res) => {

  const db = readDB();


  res.json({

    chamada:
      db.tv_chamada,

    historico:
      db.tv_historico

  });

});


// =====================================================
// LISTA DE MEDICAÇÕES
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
// CONSULTA MÉDICA
// =====================================================

app.post("/consulta", (req, res) => {

  const db = readDB();


  const consulta = {

    id: Date.now(),

    paciente:
      req.body.paciente,

    diagnostico:
      req.body.diagnostico,

    medicacao:
      req.body.medicacao,

    obs:
      req.body.obs,

    createdAt:
      new Date().toISOString()

  };


  db.consultas.push(
    consulta
  );


  writeDB(db);


  res.json(consulta);

});


// =====================================================
// MEDICAÇÕES / CONSULTAS
// =====================================================

app.get("/medicacoes", (req, res) => {

  const db = readDB();

  res.json(db.consultas);

});


// =====================================================
// FUNÇÕES PARA GERAR PDF
// =====================================================

function escaparPDF(texto) {

  if (
    texto === null ||
    texto === undefined
  ) {

    return "";

  }


  texto = String(texto);


  return texto
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

}


function removerAcentos(texto) {

  if (
    texto === null ||
    texto === undefined
  ) {

    return "";

  }


  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

}


function quebrarTexto(texto, tamanho = 85) {

  texto =
    removerAcentos(texto || "");


  const palavras =
    texto.split(/\s+/);


  const linhas = [];

  let linha = "";


  palavras.forEach(palavra => {

    if (
      (linha + " " + palavra).trim().length
      <= tamanho
    ) {

      linha =
        (linha + " " + palavra).trim();

    }

    else {

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


// =====================================================
// GERAR PDF DE ALTA
// =====================================================

function gerarPDFAlta(alta) {

  const objetos = [];


  function adicionarObjeto(conteudo) {

    objetos.push(conteudo);

    return objetos.length;

  }


  // -----------------------------------------------------
  // CONTEÚDO DO PDF
  // -----------------------------------------------------

  const linhas = [];


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


  linhas.push({
    texto: "DADOS DO PACIENTE",
    tamanho: 12,
    bold: true
  });


  linhas.push({
    texto: "Nome completo: " + (alta.paciente || "Nao informado"),
    tamanho: 10
  });


  linhas.push({
    texto: "CPF: " + (alta.cpf || "Nao informado"),
    tamanho: 10
  });


  linhas.push({
    texto: "Nome da mae: " + (alta.mae || "Nao informado"),
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


  linhas.push({
    texto: "DADOS DO ATENDIMENTO",
    tamanho: 12,
    bold: true
  });


  linhas.push({
    texto:
      "Data da alta: " +
      alta.data,
    tamanho: 10
  });


  linhas.push({
    texto:
      "Horario da alta: " +
      alta.hora,
    tamanho: 10
  });


  linhas.push({
    texto:
      "Status: ALTA MEDICA",
    tamanho: 10,
    bold: true
  });


  linhas.push({
    texto: "",
    tamanho: 10
  });


  linhas.push({
    texto: "DIAGNOSTICO",
    tamanho: 12,
    bold: true
  });


  quebrarTexto(
    alta.diagnostico || "Nao informado"
  ).forEach(texto => {

    linhas.push({
      texto: texto,
      tamanho: 10
    });

  });


  linhas.push({
    texto: "",
    tamanho: 10
  });


  linhas.push({
    texto: "MEDICACAO",
    tamanho: 12,
    bold: true
  });


  quebrarTexto(
    alta.medicacao || "Nenhuma"
  ).forEach(texto => {

    linhas.push({
      texto: texto,
      tamanho: 10
    });

  });


  linhas.push({
    texto: "",
    tamanho: 10
  });


  linhas.push({
    texto: "OBSERVACOES",
    tamanho: 12,
    bold: true
  });


  quebrarTexto(
    alta.observacoes || "Nenhuma observacao registrada."
  ).forEach(texto => {

    linhas.push({
      texto: texto,
      tamanho: 10
    });

  });


  linhas.push({
    texto: "",
    tamanho: 10
  });


  quebrarTexto(
    "Declara-se, para os devidos fins, que o paciente acima identificado recebeu alta medica apos avaliacao e conclusao do atendimento."
  ).forEach(texto => {

    linhas.push({
      texto: texto,
      tamanho: 10
    });

  });


  linhas.push({
    texto: "",
    tamanho: 10
  });


  linhas.push({
    texto: "",
    tamanho: 10
  });


  linhas.push({
    texto: "________________________________________",
    tamanho: 10,
    centralizado: true
  });


  linhas.push({
    texto: "Assinatura do medico responsavel",
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
      alta.data +
      " as " +
      alta.hora,
    tamanho: 8,
    centralizado: true
  });


  // -----------------------------------------------------
  // MONTA CONTEÚDO PDF
  // -----------------------------------------------------

  let conteudo = "";

  let y = 800;


  linhas.forEach(linha => {

    const texto =
      escaparPDF(
        removerAcentos(linha.texto)
      );


    let tamanho =
      linha.tamanho || 10;


    let fonte =
      linha.bold
        ? "Helvetica-Bold"
        : "Helvetica";


    // Espaçamento
    if (linha.texto === "") {

      y -= 10;

      return;

    }


    // Centralização aproximada
    let x = 50;


    if (linha.centralizado) {

      const larguraEstimada =
        texto.length * tamanho * 0.5;

      x =
        (595 - larguraEstimada) / 2;

    }


    conteudo +=
      `BT /${fonte} ${tamanho} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${texto}) Tj ET\n`;


    y -=
      tamanho >= 16
        ? 26
        : tamanho >= 12
          ? 20
          : 16;


    // Segurança para não passar da página
    if (y < 50) {

      y = 50;

    }

  });


  // -----------------------------------------------------
  // OBJETOS PDF
  // -----------------------------------------------------

  const objetoCatalogo =
    adicionarObjeto(
      "<< /Type /Catalog /Pages 2 0 R >>"
    );


  const objetoPaginas =
    adicionarObjeto(
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"
    );


  const objetoPagina =
    adicionarObjeto(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /Helvetica 4 0 R /Helvetica-Bold 5 0 R >> >> /Contents 6 0 R >>"
    );


  const objetoHelvetica =
    adicionarObjeto(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    );


  const objetoHelveticaBold =
    adicionarObjeto(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    );


  const stream =
    `q
1 1 1 rg
0 0 595 842 re
f
Q
${conteudo}`;


  const objetoConteudo =
    adicionarObjeto(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>
stream
${stream}
endstream`
    );


  // -----------------------------------------------------
  // CONSTRÓI ARQUIVO PDF
  // -----------------------------------------------------

  let pdf =
    "%PDF-1.4\n";


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


    pdf +=
      objetos[i];


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
      ).padStart(10, "0") +
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


// =====================================================
// ALTA MÉDICA + PDF
// =====================================================

app.post("/alta-paciente", (req, res) => {

  try {

    const db = readDB();


    const nomePaciente =
      req.body.paciente;


    const diagnostico =
      req.body.diagnostico;


    const medicacao =
      req.body.medicacao;


    const obs =
      req.body.obs;


    // -------------------------------------------------
    // VALIDAÇÃO
    // -------------------------------------------------

    if (!nomePaciente) {

      return res.status(400).json({

        sucesso: false,

        mensagem:
          "Selecione um paciente antes de dar alta."

      });

    }


    // -------------------------------------------------
    // PROCURA PACIENTE
    // -------------------------------------------------

    const paciente =
      db.pacientes
        .slice()
        .reverse()
        .find(p =>
          p.nome === nomePaciente
        );


    if (!paciente) {

      return res.status(404).json({

        sucesso: false,

        mensagem:
          "Paciente não encontrado no sistema."

      });

    }


    // -------------------------------------------------
    // DATA E HORA
    // -------------------------------------------------

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


    // -------------------------------------------------
    // VERIFICA SE JÁ RECEBEU ALTA
    // -------------------------------------------------

    const altaExistente =
      db.altas.find(a =>
        a.pacienteId === paciente.id &&
        a.status === "alta"
      );


    if (altaExistente) {

      return res.status(409).json({

        sucesso: false,

        mensagem:
          "Este paciente já possui uma alta registrada."

      });

    }


    // -------------------------------------------------
    // REGISTRA CONSULTA
    // -------------------------------------------------

    const consulta = {

      id: Date.now(),

      pacienteId:
        paciente.id,

      paciente:
        paciente.nome,

      diagnostico:
        diagnostico || "Não informado",

      medicacao:
        medicacao || "Nenhuma",

      obs:
        obs || "Nenhuma",

      createdAt:
        iso,

      status:
        "finalizada"

    };


    db.consultas.push(
      consulta
    );


    // -------------------------------------------------
    // REGISTRA ALTA
    // -------------------------------------------------

    const alta = {

      id:
        Date.now() + 1,

      pacienteId:
        paciente.id,

      paciente:
        paciente.nome,

      cpf:
        paciente.cpf,

      mae:
        paciente.mae,

      nascimento:
        paciente.nascimento,

      estadoCivil:
        paciente.estadoCivil,

      telefone:
        paciente.telefone,

      email:
        paciente.email,

      endereco:
        paciente.endereco,

      diagnostico:
        diagnostico || "Não informado",

      medicacao:
        medicacao || "Nenhuma",

      observacoes:
        obs || "Nenhuma",

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


    // -------------------------------------------------
    // ATUALIZA PACIENTE
    // -------------------------------------------------

    const pacienteIndex =
      db.pacientes.findIndex(
        p => p.id === paciente.id
      );


    if (pacienteIndex !== -1) {

      db.pacientes[pacienteIndex].status =
        "alta";


      db.pacientes[pacienteIndex].altaEm =
        iso;

    }


    // -------------------------------------------------
    // REMOVE DA FILA DE TRIAGEM
    // -------------------------------------------------

    db.triagens =
      db.triagens.filter(
        triagem => {

          return !(
            triagem.nome === paciente.nome &&
            triagem.status === "aguardando_medico"
          );

        }
      );


    // -------------------------------------------------
    // SALVA BANCO
    // -------------------------------------------------

    writeDB(db);


    // -------------------------------------------------
    // GERA PDF
    // -------------------------------------------------

    const pdf =
      gerarPDFAlta(alta);


    res.setHeader(
      "Content-Type",
      "application/pdf"
    );


    res.setHeader(
      "Content-Disposition",
      `inline; filename="alta-${paciente.id}.pdf"`
    );


    res.setHeader(
      "Content-Length",
      pdf.length
    );


    res.end(pdf);

  }

  catch (erro) {

    console.error(
      "Erro ao realizar alta:",
      erro
    );


    res.status(500).json({

      sucesso: false,

      mensagem:
        "Erro interno ao realizar a alta do paciente."

    });

  }

});


// =====================================================
// LISTAR ALTAS
// =====================================================

app.get("/altas", (req, res) => {

  const db = readDB();

  res.json(db.altas);

});


// =====================================================
// BUSCAR ALTA POR ID
// =====================================================

app.get("/alta/:id", (req, res) => {

  const db = readDB();


  const alta =
    db.altas.find(
      a =>
        String(a.id) ===
        String(req.params.id)
    );


  if (!alta) {

    return res.status(404).json({

      mensagem:
        "Alta não encontrada."

    });

  }


  res.json(alta);

});


// =====================================================
// INICIAR SERVIDOR
// =====================================================

const PORT =
  process.env.PORT || 3000;


// IMPORTANTE PARA O RENDER
app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Servidor MEDCORE rodando na porta ${PORT}`
    );

  }
);
