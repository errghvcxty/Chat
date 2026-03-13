let contatoAtual = null

// ----------------------
// ADICIONAR CONTATO
// ----------------------

async function adicionarContato(){

let nome = document.getElementById("nomeContato").value

if(!nome){
alert("Digite o nome do contato")
return
}

let resposta = await fetch("/buscar_usuario/" + nome)

let usuario = await resposta.json()

if(!usuario){
alert("Usuário não encontrado")
return
}

let lista = document.getElementById("lista-contatos")

let item = document.createElement("li")

item.classList.add("contato")

item.innerHTML = `
<div class="avatar"></div>
<span class="nome">${usuario.nome}</span>
`

item.onclick = function(){
abrirConversa(usuario.id, usuario.nome)
}

lista.appendChild(item)

document.getElementById("nomeContato").value=""

}


// ----------------------
// ABRIR CONVERSA
// ----------------------

function abrirConversa(id,nome){

contatoAtual = id

document.getElementById("nome-contato").innerText = nome

carregarMensagens()

}


// ----------------------
// ENVIAR MENSAGEM
// ----------------------

function enviar(){

if(!contatoAtual){
alert("Selecione um contato")
return
}

let texto = document.getElementById("texto").value

if(texto.trim()==="") return

fetch("/enviar",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

destinatario:Number(contatoAtual),
texto:texto

})

})
.then(()=>{

document.getElementById("texto").value=""

carregarMensagens()

})

}


// ----------------------
// CARREGAR MENSAGENS
// ----------------------

function carregarMensagens(){

if(!contatoAtual) return

fetch(`/mensagens/${contatoAtual}`)

.then(r=>r.json())

.then(lista=>{

let div = document.getElementById("mensagens")

div.innerHTML=""

lista.forEach(m=>{

let msg = document.createElement("div")

msg.classList.add("mensagem")

if(m.remetente == usuario_id){
msg.classList.add("minha")
}else{
msg.classList.add("outro")
}

msg.innerText = m.mensagem

div.appendChild(msg)

})

div.scrollTop = div.scrollHeight

})

}


// ----------------------
// CARREGAR CONVERSAS
// ----------------------

function carregarConversas(){

fetch(`/conversas/${usuario_id}`)

.then(r=>r.json())

.then(lista=>{

let ul = document.getElementById("lista-contatos")

ul.innerHTML=""

lista.forEach(c=>{

let li = document.createElement("li")

li.classList.add("contato")

li.innerHTML = `
<div class="avatar"></div>
<span class="nome">${c.nome}</span>
`

li.onclick = ()=>abrirConversa(c.id,c.nome)

ul.appendChild(li)

})

})

}


// ----------------------
// ATUALIZAÇÃO AUTOMÁTICA
// ----------------------

setInterval(()=>{

carregarConversas()

if(contatoAtual){
carregarMensagens()
}

},2000)
item.innerHTML = `
<div class="avatar">
<i class="fa-solid fa-user"></i>
</div>
<span class="nome">${usuario.nome}</span>
`