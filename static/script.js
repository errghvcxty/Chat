const API_URL = "https://apichat-production-e8b7.up.railway.app";

const usuario_id =
Number(localStorage.getItem("usuario_id"));

let contatoAtual = null;

// ----------------------
// ADICIONAR CONTATO
// ----------------------

async function adicionarContato() {

    let nome = document.getElementById("nomeContato").value;

    if (!nome) {
        alert("Digite o nome do contato");
        return;
    }

    try {

        let resposta = await fetch(
            `${API_URL}/buscar_usuario/${nome}`
        );

        let usuario = await resposta.json();

        if (!usuario) {
            alert("Usuário não encontrado");
            return;
        }

        let lista = document.getElementById("lista-contatos");

        let item = document.createElement("li");

        item.classList.add("contato");

        item.innerHTML = `
            <div class="avatar">
                <i class="fa-solid fa-user"></i>
            </div>
            <span class="nome">${usuario.nome}</span>
        `;

        item.onclick = () => {
            abrirConversa(usuario.id, usuario.nome);
        };

        lista.appendChild(item);

        document.getElementById("nomeContato").value = "";

    } catch (erro) {
        console.error(erro);
    }
}

// ----------------------
// ABRIR CONVERSA
// ----------------------

function abrirConversa(id, nome) {

    contatoAtual = id;

    document.getElementById("nome-contato").innerText = nome;

    carregarMensagens();
}

// ----------------------
// ENVIAR MENSAGEM
// ----------------------

async function enviar() {

    if (!contatoAtual) {
        alert("Selecione um contato");
        return;
    }

    let texto = document.getElementById("texto").value;

    if (texto.trim() === "") return;

    try {

        await fetch(`${API_URL}/enviar`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                remetente: usuario_id,
                destinatario: contatoAtual,
                texto: texto
            })

        });

        document.getElementById("texto").value = "";

        carregarMensagens();

    } catch (erro) {
        console.error(erro);
    }
}

// ----------------------
// CARREGAR MENSAGENS
// ----------------------

async function carregarMensagens() {

    if (!contatoAtual) return;

    try {

        let resposta = await fetch(
            `${API_URL}/mensagens/${contatoAtual}?usuario=${usuario_id}`
        );

        let lista = await resposta.json();

        let div = document.getElementById("mensagens");

        div.innerHTML = "";

        lista.forEach(m => {

            let msg = document.createElement("div");

            msg.classList.add("mensagem");

            if (m.remetente === usuario_id) {
                msg.classList.add("minha");
            } else {
                msg.classList.add("outro");
            }

            msg.innerText = m.mensagem;

            div.appendChild(msg);
        });

        div.scrollTop = div.scrollHeight;

    } catch (erro) {
        console.error(erro);
    }
}

// ----------------------
// CARREGAR CONVERSAS
// ----------------------

async function carregarConversas() {

    try {

        let resposta = await fetch(
            `${API_URL}/conversas/${usuario_id}`
        );

        let lista = await resposta.json();

        let ul = document.getElementById("lista-contatos");

        ul.innerHTML = "";

        lista.forEach(c => {

            let li = document.createElement("li");

            li.classList.add("contato");

            li.innerHTML = `
                <div class="avatar">
                    <i class="fa-solid fa-user"></i>
                </div>
                <span class="nome">${c.nome}</span>
            `;

            li.onclick = () => {
                abrirConversa(c.id, c.nome);
            };

            ul.appendChild(li);
        });

    } catch (erro) {
        console.error(erro);
    }
}

// ----------------------
// AUTO UPDATE
// ----------------------

setInterval(() => {

    carregarConversas();

    if (contatoAtual) {
        carregarMensagens();
    }

}, 2000);

// ----------------------
// INICIALIZAÇÃO
// ----------------------

carregarConversas();