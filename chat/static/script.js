// Variáveis globais
let contatoAtual = null

// Elementos do DOM
const inputPesquisa = document.getElementById("pesquisa")
const btnPesquisar = document.getElementById("btnPesquisar")
const lista = document.getElementById("lista-contatos")
const mensagens = document.getElementById("mensagens")
const btnEnviar = document.getElementById("btnEnviar")
const inputTexto = document.getElementById("texto")
const chatNome = document.getElementById("chat-nome")
const chatAvatar = document.getElementById("chat-avatar")

// Verificar se todos os elementos foram encontrados
console.log("Elementos carregados:", {
    inputPesquisa: !!inputPesquisa,
    btnPesquisar: !!btnPesquisar,
    lista: !!lista,
    mensagens: !!mensagens,
    btnEnviar: !!btnEnviar,
    inputTexto: !!inputTexto
})

/* ===================== */
/* INICIALIZAÇÃO */
/* ===================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Página carregada, iniciando...")
    carregarConversas()
})

/* ===================== */
/* CARREGAR CONVERSAS */
/* ===================== */

async function carregarConversas() {
    try {
        console.log("Carregando conversas...")
        const resposta = await fetch("/conversas")
        
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`)
        }
        
        const conversas = await resposta.json()
        console.log("Conversas carregadas:", conversas)
        
        lista.innerHTML = ""
        
        if (!conversas || conversas.length === 0) {
            lista.innerHTML = "<li class='mensagem-info'>Nenhuma conversa anterior</li>"
            return
        }
        
        conversas.forEach(conversa => {
            adicionarContatoNaLista(conversa.nome)
        })
        
    } catch (erro) {
        console.error("Erro ao carregar conversas:", erro)
        lista.innerHTML = "<li class='mensagem-info erro'>Erro ao carregar conversas</li>"
    }
}

/* ===================== */
/* ADICIONAR CONTATO À LISTA */
/* ===================== */

function adicionarContatoNaLista(nomeUsuario) {
    if (!nomeUsuario) return
    
    const li = document.createElement("li")
    li.className = "contato"
    li.setAttribute("data-usuario", nomeUsuario)
    
    li.onclick = () => abrirChat(nomeUsuario)
    
    li.innerHTML = `
        <div class="avatar">${nomeUsuario.charAt(0).toUpperCase()}</div>
        <span>${nomeUsuario}</span>
    `
    
    lista.appendChild(li)
}

/* ===================== */
/* PESQUISAR USUARIOS */
/* ===================== */

if (btnPesquisar) {
    btnPesquisar.addEventListener("click", pesquisar)
}

if (inputPesquisa) {
    inputPesquisa.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            e.preventDefault()
            pesquisar()
        }
    })
}

async function pesquisar() {
    const nome = inputPesquisa.value.trim()
    if (!nome) return
    
    console.log("Pesquisando por:", nome)
    
    try {
        const resposta = await fetch("/pesquisar?nome=" + encodeURIComponent(nome))
        
        if (!resposta.ok) {
            throw new Error("Erro HTTP: " + resposta.status)
        }
        
        const usuarios = await resposta.json()
        console.log("Usuários encontrados:", usuarios)
        
        lista.innerHTML = ""
        
        if (!usuarios || usuarios.length === 0) {
            lista.innerHTML = "<li class='mensagem-info'>Nenhum usuário encontrado</li>"
            return
        }
        
        usuarios.forEach(nomeUsuario => {
            adicionarContatoNaLista(nomeUsuario)
        })
        
    } catch (erro) {
        console.error("Erro ao pesquisar:", erro)
        lista.innerHTML = "<li class='mensagem-info erro'>Erro na pesquisa</li>"
    }
}

/* ===================== */
/* ABRIR CHAT */
/* ===================== */

function abrirChat(usuario) {
    if (!usuario) return
    
    console.log("Abrindo chat com:", usuario)
    contatoAtual = usuario
    
    // Atualizar cabeçalho do chat
    if (chatNome) {
        chatNome.innerText = usuario
    }
    
    if (chatAvatar) {
        chatAvatar.innerText = usuario.charAt(0).toUpperCase()
    }
    
    // Limpar mensagens anteriores
    mensagens.innerHTML = "<div class='loading'>Carregando mensagens...</div>"
    
    // Carregar mensagens do chat
    carregarMensagens()
    
    // Focar no input de texto
    if (inputTexto) {
        inputTexto.focus()
        inputTexto.disabled = false
    }
    
    if (btnEnviar) {
        btnEnviar.disabled = false
    }
}

/* ===================== */
/* CARREGAR MENSAGENS */
/* ===================== */

async function carregarMensagens() {
    if (!contatoAtual) {
        console.log("Nenhum contato selecionado")
        return
    }
    
    console.log("Carregando mensagens com:", contatoAtual)
    
    try {
        const resposta = await fetch(`/mensagens?user2=${encodeURIComponent(contatoAtual)}`)
        
        if (!resposta.ok) {
            throw new Error("Erro HTTP: " + resposta.status)
        }
        
        const msgs = await resposta.json()
        console.log("Mensagens carregadas:", msgs)
        
        mensagens.innerHTML = ""
        
        if (!msgs || msgs.length === 0) {
            mensagens.innerHTML = "<div class='mensagem-info'>Nenhuma mensagem ainda. Envie a primeira!</div>"
            return
        }
        
        msgs.forEach(m => {
            const div = document.createElement("div")
            div.className = "mensagem " + (m.remetente === "eu" ? "minha" : "outro")
            
            const textoDiv = document.createElement("div")
            textoDiv.className = "texto"
            textoDiv.innerText = m.mensagem
            div.appendChild(textoDiv)
            
            if (m.data) {
                const dataSpan = document.createElement("span")
                dataSpan.className = "data"
                try {
                    const data = new Date(m.data)
                    dataSpan.innerText = data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                } catch (e) {
                    dataSpan.innerText = ""
                }
                div.appendChild(dataSpan)
            }
            
            mensagens.appendChild(div)
        })
        
        // Rolar para a última mensagem
        mensagens.scrollTop = mensagens.scrollHeight
        
    } catch (erro) {
        console.error("Erro ao carregar mensagens:", erro)
        mensagens.innerHTML = "<div class='mensagem-info erro'>Erro ao carregar mensagens</div>"
    }
}

/* ===================== */
/* ENVIAR MENSAGEM */
/* ===================== */

if (btnEnviar) {
    btnEnviar.addEventListener("click", enviar)
}

if (inputTexto) {
    inputTexto.addEventListener("keypress", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            enviar()
        }
    })
}

async function enviar() {
    const texto = inputTexto.value.trim()
    
    if (!texto) {
        console.log("Mensagem vazia")
        return
    }
    
    if (!contatoAtual) {
        console.log("Nenhum contato selecionado")
        alert("Selecione um contato primeiro")
        return
    }
    
    console.log("Enviando mensagem para:", contatoAtual, "Texto:", texto)
    
    // Desabilitar botão temporariamente
    if (btnEnviar) btnEnviar.disabled = true
    
    try {
        const resposta = await fetch("/enviar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                destinatario: contatoAtual,
                mensagem: texto
            })
        })
        
        console.log("Resposta do servidor:", resposta.status)
        
        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}))
            throw new Error(erro.mensagem || `Erro HTTP: ${resposta.status}`)
        }
        
        const resultado = await resposta.json()
        console.log("Resultado:", resultado)
        
        if (resultado.status === "ok") {
            inputTexto.value = ""
            await carregarMensagens()
        } else {
            throw new Error(resultado.mensagem || "Erro desconhecido")
        }
        
    } catch (erro) {
        console.error("Erro ao enviar:", erro)
        alert("Erro ao enviar mensagem: " + erro.message)
    } finally {
        // Reabilitar botão
        if (btnEnviar) btnEnviar.disabled = false
        if (inputTexto) inputTexto.focus()
    }
}

/* ===================== */
/* ATUALIZAR CHAT AUTOMATICAMENTE */
/* ===================== */

let intervaloAtualizacao = null

function iniciarAtualizacaoAutomatica() {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao)
    }
    
    intervaloAtualizacao = setInterval(() => {
        if (contatoAtual && document.visibilityState === "visible") {
            console.log("Atualizando mensagens automaticamente...")
            carregarMensagens()
        }
    }, 3000)
}

function pararAtualizacaoAutomatica() {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao)
        intervaloAtualizacao = null
    }
}

// Iniciar atualização quando abrir chat
const abrirChatOriginal = abrirChat
abrirChat = function(usuario) {
    abrirChatOriginal(usuario)
    iniciarAtualizacaoAutomatica()
}

// Parar atualização quando mudar de página
window.addEventListener("beforeunload", pararAtualizacaoAutomatica)

// Controlar atualização baseado na visibilidade da página
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && contatoAtual) {
        carregarMensagens()
        iniciarAtualizacaoAutomatica()
    } else {
        pararAtualizacaoAutomatica()
    }
})

// Log para debug
console.log("Script carregado com sucesso!")