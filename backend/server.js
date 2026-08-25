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
      tv_chamada: null,
      tv_historico: []
    };

  }


  const db =
    JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );


  // Garante que os campos existam
  if (!db.usuarios) db.usuarios = [];
  if (!db.pacientes) db.pacientes = [];
  if (!db.triagens) db.triagens = [];
  if (!db.consultas) db.consultas = [];

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


  const usuario =
    req.body.usuario;

  const senha =
    req.body.senha;


  const user =
    db.usuarios.find(u =>
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


  /*
  =====================================================
  RECEBE OS DADOS DO FORMULÁRIO
  =====================================================
  */

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


  /*
  =====================================================
  VALIDAÇÃO DOS CAMPOS PRINCIPAIS
  =====================================================
  */

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


  /*
  =====================================================
  SALVA NO BANCO
  =====================================================
  */

  db.pacientes.push(paciente);

  writeDB(db);


  /*
  =====================================================
  RETORNA O PACIENTE
  =====================================================
  */

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


  let risco =
    req.body.risco;


  /*
  =====================================================
  CLASSIFICAÇÃO AUTOMÁTICA
  =====================================================
  */

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

  res.json(db.triagens);

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


  db.tv_chamada =
    chamada;


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
