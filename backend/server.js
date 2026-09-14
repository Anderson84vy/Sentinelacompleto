<!DOCTYPE html>
<html>

<head>

  <link rel="stylesheet" href="css/style.css">

  <style>

    .btn-tv {
      background: #28a745;
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 8px;
    }

    .btn-tv:hover {
      background: #1e7e34;
    }


    .btn-abrir-tv {
      background: #17a2b8;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      font-size: 14px;
      cursor: pointer;
    }

    .btn-abrir-tv:hover {
      background: #117a8b;
    }


    .consultorio-input {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      background: #f0f4ff;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #d0d8f0;
    }

    .consultorio-input label {
      font-weight: bold;
    }

    .consultorio-input input {
      width: 60px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      padding: 4px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }


    /* BOTÕES DA CONSULTA */

    .acoes-consulta {
      display: flex;
      gap: 10px;
      margin-top: 15px;
      flex-wrap: wrap;
    }


    .btn-salvar {
      background: #007bff;
      color: white;
      border: none;
      padding: 11px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 15px;
      font-weight: bold;
    }

    .btn-salvar:hover {
      background: #0056b3;
    }


    .btn-alta {
      background: #28a745;
      color: white;
      border: none;
      padding: 11px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 15px;
      font-weight: bold;
    }

    .btn-alta:hover {
      background: #218838;
    }

    .btn-alta:disabled {
      background: #999;
      cursor: not-allowed;
    }


    .aviso-alta {
      margin-top: 12px;
      padding: 10px;
      background: #f8f9fa;
      border-left: 4px solid #28a745;
      color: #555;
      font-size: 13px;
      border-radius: 4px;
    }

  </style>

</head>


<body>


<div class="container">


  <!-- CABEÇALHO -->

  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:20px;
  ">

    <h2 style="margin:0;">
      🩺 Painel Médico
    </h2>


    <button
      class="btn-abrir-tv"
      onclick="window.open('tv.html','_blank')">

      📺 Abrir Tela da TV

    </button>

  </div>


  <!-- CONSULTÓRIO -->

  <div class="consultorio-input">

    <label>
      Meu Consultório:
    </label>


    <input
      type="text"
      id="consultorio-num"
      value="01">


    <span style="
      color:#666;
      font-size:13px;
    ">

      Este número será exibido na TV
      ao chamar o paciente.

    </span>

  </div>


  <!-- FILA DE PACIENTES -->

  <div id="triagens"></div>


  <hr>


  <!-- CONSULTA -->

  <h3>
    Consulta
  </h3>


  <input
    id="paciente"
    placeholder="Paciente"
    readonly>


  <input
    id="diagnostico"
    placeholder="Diagnóstico">


  <select id="medicacao">

    <option value="">
      Selecione a medicação
    </option>

  </select>


  <textarea
    id="obs"
    placeholder="Observações">
  </textarea>


  <!-- BOTÕES -->

  <div class="acoes-consulta">


    <button
      class="btn-salvar"
      onclick="salvar()">

      💾 Salvar Consulta

    </button>


    <button
      id="btn-alta"
      class="btn-alta"
      onclick="darAlta()"
      disabled>

      🟢 Dar Alta + Baixar PDF

    </button>


  </div>


  <div class="aviso-alta">

    <b>📋 Alta médica:</b>

    selecione um paciente,
    informe o diagnóstico e a medicação.

    Ao clicar em
    <b>Dar Alta + Baixar PDF</b>,
    o sistema registrará a alta e
    fará o download do documento.

  </div>


</div>


<script>


/* =====================================================
   VARIÁVEIS
===================================================== */

let triagensCarregadas = [];


/* =====================================================
   CARREGAR TRIAGENS
===================================================== */

function carregar() {

  fetch("/triagens")

    .then(r => {

      if (!r.ok) {
        throw new Error("Erro ao carregar pacientes.");
      }

      return r.json();

    })

    .then(data => {

      triagensCarregadas = data;


      const div =
        document.getElementById("triagens");


      div.innerHTML = "";


      if (data.length === 0) {

        div.innerHTML = `
          <p style="
            color:#888;
            text-align:center;
          ">
            Nenhum paciente na fila.
          </p>
        `;

        return;

      }


      data.forEach((t, index) => {

        div.innerHTML += `

          <div class="card">

            <h3>
              ${t.nome}
            </h3>


            <p>
              <b>Sintoma:</b>
              ${t.sintoma || "Não informado"}
            </p>


            <p>
              <b>Temperatura:</b>
              ${t.temperatura || "Não informada"}°C
            </p>


            <p>
              <span class="${t.risco}">
                ${t.risco}
              </span>
            </p>


            <p>
              <b>Alergia:</b>
              ${t.alergia || "Nenhuma"}
            </p>


            <p>
              <b>Observação:</b>
              ${t.observacao || "Nenhuma"}
            </p>


            <div style="
              display:flex;
              gap:8px;
              flex-wrap:wrap;
            ">


              <button
                onclick="selecionar(${index})">

                🩺 Atender

              </button>


              <button
                class="btn-tv"
                onclick="chamarNaTV(
                  '${t.nome.replace(/'/g, "\\'")}'
                )">

                📺 Chamar na TV

              </button>


            </div>

          </div>

        `;

      });

    })

    .catch(erro => {

      console.error(erro);

      document.getElementById("triagens").innerHTML = `
        <p style="
          color:red;
          text-align:center;
        ">
          ❌ Erro ao carregar a fila.
        </p>
      `;

    });

}


/* =====================================================
   CHAMAR NA TV
===================================================== */

function chamarNaTV(nome) {

  const consultorio =
    document.getElementById(
      "consultorio-num"
    ).value || "01";


  fetch("/tv/chamar", {

    method: "POST",

    headers: {
      "Content-Type":
        "application/json"
    },

    body: JSON.stringify({

      localTipo:
        "CONSULTÓRIO",

      localNumero:
        consultorio,

      paciente:
        nome

    })

  })

  .then(r => {

    if (!r.ok) {
      throw new Error();
    }

    return r.json();

  })

  .then(() => {

    alert(
      "✅ " +
      nome +
      " foi chamado na TV para o Consultório " +
      consultorio +
      "!"
    );

  })

  .catch(() => {

    alert(
      "❌ Não foi possível chamar o paciente na TV."
    );

  });

}


/* =====================================================
   SELECIONAR PACIENTE
===================================================== */

function selecionar(index) {

  const t =
    triagensCarregadas[index];


  if (!t) {

    alert(
      "❌ Paciente não encontrado."
    );

    return;

  }


  document.getElementById(
    "paciente"
  ).value = t.nome;


  document.getElementById(
    "obs"
  ).value =
    t.observacao || "";


  /* HABILITA BOTÃO DE ALTA */

  document.getElementById(
    "btn-alta"
  ).disabled = false;


  /* ALERTA DE ALERGIA */

  if (
    t.alergia &&
    t.alergia !== "Nenhuma"
  ) {

    alert(
      "⚠️ Paciente possui alergia: " +
      t.alergia
    );

  }

}


/* =====================================================
   CARREGAR MEDICAÇÕES
===================================================== */

function carregarMedicacoes() {

  fetch("/lista-medicacoes")

    .then(r => r.json())

    .then(data => {

      const select =
        document.getElementById(
          "medicacao"
        );


      select.innerHTML = `
        <option value="">
          Selecione a medicação
        </option>
      `;


      data.forEach(med => {

        const option =
          document.createElement(
            "option"
          );


        option.value = med;

        option.textContent = med;


        select.appendChild(option);

      });

    })

    .catch(erro => {

      console.error(
        "Erro nas medicações:",
        erro
      );

    });

}


/* =====================================================
   SALVAR CONSULTA
===================================================== */

function salvar() {

  const paciente =
    document.getElementById(
      "paciente"
    ).value.trim();


  const diagnostico =
    document.getElementById(
      "diagnostico"
    ).value.trim();


  const medicacao =
    document.getElementById(
      "medicacao"
    ).value.trim();


  const obs =
    document.getElementById(
      "obs"
    ).value.trim();


  if (!paciente) {

    alert(
      "⚠️ Selecione um paciente clicando em Atender."
    );

    return;

  }


  if (!diagnostico) {

    alert(
      "⚠️ Informe o diagnóstico."
    );

    return;

  }


  if (!medicacao) {

    alert(
      "⚠️ Selecione uma medicação."
    );

    return;

  }


  fetch("/consulta", {

    method: "POST",

    headers: {
      "Content-Type":
        "application/json"
    },

    body: JSON.stringify({

      paciente,
      diagnostico,
      medicacao,
      obs

    })

  })

  .then(r => {

    if (!r.ok) {

      throw new Error(
        "Erro ao salvar consulta."
      );

    }

    return r.json();

  })

  .then(() => {

    alert(
      "✅ Consulta salva com sucesso!"
    );

    limparConsulta();

  })

  .catch(erro => {

    console.error(erro);

    alert(
      "❌ Não foi possível salvar a consulta."
    );

  });

}


/* =====================================================
   DAR ALTA + BAIXAR PDF
===================================================== */

async function darAlta() {

  const paciente =
    document.getElementById(
      "paciente"
    ).value.trim();


  const diagnostico =
    document.getElementById(
      "diagnostico"
    ).value.trim();


  const medicacao =
    document.getElementById(
      "medicacao"
    ).value.trim();


  const obs =
    document.getElementById(
      "obs"
    ).value.trim();


  /* PACIENTE */

  if (!paciente) {

    alert(
      "⚠️ Selecione um paciente antes de dar alta."
    );

    return;

  }


  /* DIAGNÓSTICO */

  if (!diagnostico) {

    alert(
      "⚠️ Informe o diagnóstico antes de dar alta."
    );


    document
      .getElementById(
        "diagnostico"
      )
      .focus();


    return;

  }


  /* MEDICAÇÃO */

  if (!medicacao) {

    alert(
      "⚠️ Selecione a medicação antes de dar alta."
    );

    return;

  }


  /* CONFIRMAÇÃO */

  const confirmar = confirm(

    "⚠️ CONFIRMAR ALTA MÉDICA\n\n" +

    "Paciente: " +
    paciente +
    "\n" +

    "Diagnóstico: " +
    diagnostico +
    "\n" +

    "Medicação: " +
    medicacao +
    "\n\n" +

    "Ao confirmar, o paciente receberá alta " +
    "e o PDF será baixado automaticamente.\n\n" +

    "Deseja realmente dar alta?"

  );


  if (!confirmar) {

    return;

  }


  const botao =
    document.getElementById(
      "btn-alta"
    );


  /* EVITA DUPLO CLIQUE */

  botao.disabled = true;

  botao.innerText =
    "⏳ Gerando PDF...";


  try {


    /* ENVIA PARA O BACKEND */

    const resposta =
      await fetch(
        "/alta-paciente",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body: JSON.stringify({

            paciente,
            diagnostico,
            medicacao,
            obs

          })

        }
      );


    /* VERIFICA ERRO */

    if (!resposta.ok) {

      let mensagem =
        "Erro ao registrar a alta.";


      try {

        const erro =
          await resposta.json();


        mensagem =
          erro.mensagem ||
          erro.erro ||
          erro.message ||
          mensagem;

      }

      catch (_) {}


      throw new Error(
        mensagem
      );

    }


    /* =================================================
       RECEBE O PDF
    ================================================= */

    const blob =
      await resposta.blob();


    /* =================================================
       CRIA LINK TEMPORÁRIO
    ================================================= */

    const url =
      URL.createObjectURL(
        blob
      );


    /* =================================================
       CRIA DOWNLOAD
    ================================================= */

    const link =
      document.createElement(
        "a"
      );


    link.href =
      url;


    link.download =
      `Alta_Medica_${paciente.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.pdf`;


    link.style.display =
      "none";


    document.body.appendChild(
      link
    );


    /* DISPARA DOWNLOAD */

    link.click();


    /* REMOVE LINK */

    document.body.removeChild(
      link
    );


    /* LIBERA MEMÓRIA */

    setTimeout(() => {

      URL.revokeObjectURL(
        url
      );

    }, 60000);


    /* =================================================
       SUCESSO
    ================================================= */

    alert(

      "✅ ALTA REALIZADA COM SUCESSO!\n\n" +

      "📄 O PDF foi baixado automaticamente.\n\n" +

      "Paciente: " +
      paciente

    );


    /* LIMPA CONSULTA */

    limparConsulta();


    /* ATUALIZA FILA */

    carregar();


  }

  catch (erro) {

    console.error(
      "Erro ao realizar alta:",
      erro
    );


    alert(

      "❌ Não foi possível realizar a alta.\n\n" +

      erro.message

    );

  }


  finally {

    botao.disabled =
      false;


    botao.innerText =
      "🟢 Dar Alta + Baixar PDF";

  }

}


/* =====================================================
   LIMPAR CONSULTA
===================================================== */

function limparConsulta() {

  document.getElementById(
    "paciente"
  ).value = "";


  document.getElementById(
    "diagnostico"
  ).value = "";


  document.getElementById(
    "medicacao"
  ).value = "";


  document.getElementById(
    "obs"
  ).value = "";


  /* DESABILITA ALTA */

  document.getElementById(
    "btn-alta"
  ).disabled = true;

}


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

carregar();

carregarMedicacoes();


/* ATUALIZA FILA A CADA 10 SEGUNDOS */

setInterval(
  carregar,
  10000
);

</script>

</body>

</html>
