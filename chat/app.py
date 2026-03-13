from flask import Flask, render_template, request, redirect, session, jsonify
import sqlite3
from datetime import datetime
import traceback

app = Flask(__name__)
app.secret_key = "segredo123"
app.config['DEBUG'] = True

DB = "chat.db"


def conectar():
    return sqlite3.connect(DB)


# -----------------------
# INICIALIZAR BANCO DE DADOS
# -----------------------

def init_db():
    print("Inicializando banco de dados...")
    try:
        conn = conectar()
        cursor = conn.cursor()
        
        # Criar tabela de usuários
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL
        )
        """)
        
        # Verificar se a coluna data_envio existe na tabela mensagens
        cursor.execute("PRAGMA table_info(mensagens)")
        colunas = cursor.fetchall()
        colunas_existentes = [coluna[1] for coluna in colunas]
        
        if not colunas_existentes:
            # Tabela não existe, criar do zero
            cursor.execute("""
            CREATE TABLE mensagens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                remetente_id INTEGER NOT NULL,
                destinatario_id INTEGER NOT NULL,
                mensagem TEXT NOT NULL,
                data_envio TIMESTAMP,
                FOREIGN KEY (remetente_id) REFERENCES usuarios(id),
                FOREIGN KEY (destinatario_id) REFERENCES usuarios(id)
            )
            """)
            print("Tabela mensagens criada com sucesso!")
        else:
            # Tabela existe, verificar se precisa adicionar coluna data_envio
            if 'data_envio' not in colunas_existentes:
                cursor.execute("ALTER TABLE mensagens ADD COLUMN data_envio TIMESTAMP")
                print("Coluna data_envio adicionada à tabela mensagens!")
        
        conn.commit()
        conn.close()
        print("Banco de dados inicializado com sucesso!")
        
    except Exception as e:
        print(f"Erro ao criar tabelas: {str(e)}")
        traceback.print_exc()


# -----------------------
# LOGIN
# -----------------------

@app.route("/")
def home():
    return render_template("login.html")


@app.route("/login", methods=["POST"])
def login():
    nome = request.form["nome"]
    senha = request.form["senha"]

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT id, senha FROM usuarios WHERE nome=?", (nome,))
    user = cursor.fetchone()

    if user is None:
        cursor.execute("INSERT INTO usuarios (nome, senha) VALUES (?, ?)", (nome, senha))
        conn.commit()
        user_id = cursor.lastrowid
    else:
        if user[1] != senha:
            conn.close()
            return "Senha incorreta"
        user_id = user[0]

    session["user_id"] = user_id
    session["nome"] = nome

    conn.close()
    return redirect("/chat")


# -----------------------
# CHAT
# -----------------------

@app.route("/chat")
def chat():
    if "user_id" not in session:
        return redirect("/")
    return render_template("chat.html", nome=session["nome"])


# -----------------------
# PESQUISAR USUARIOS
# -----------------------

@app.route("/pesquisar")
def pesquisar():
    if "user_id" not in session:
        return jsonify({"erro": "Não autorizado"}), 401
    
    nome = request.args.get("nome", "")
    
    if not nome:
        return jsonify([])
    
    try:
        conn = conectar()
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT nome
        FROM usuarios
        WHERE nome LIKE ? AND id != ?
        """, (f"%{nome}%", session["user_id"]))
        
        usuarios = cursor.fetchall()
        conn.close()
        
        return jsonify([u[0] for u in usuarios])
        
    except Exception as e:
        print(f"Erro em /pesquisar: {str(e)}")
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# -----------------------
# ENVIAR MENSAGEM
# -----------------------

@app.route("/enviar", methods=["POST"])
def enviar():
    try:
        print("=== INICIANDO ENVIO DE MENSAGEM ===")
        
        if "user_id" not in session:
            print("Usuário não autenticado")
            return jsonify({"status": "erro", "mensagem": "Não autorizado"}), 401

        data = request.get_json()
        print(f"Dados recebidos: {data}")
        
        if not data:
            print("Dados inválidos: None")
            return jsonify({"status": "erro", "mensagem": "Dados inválidos"}), 400

        destinatario_nome = data.get("destinatario")
        mensagem_texto = data.get("mensagem")
        
        print(f"Destinatário: {destinatario_nome}")
        print(f"Mensagem: {mensagem_texto}")
        
        if not destinatario_nome or not mensagem_texto:
            print("Campos obrigatórios faltando")
            return jsonify({"status": "erro", "mensagem": "Campos obrigatórios"}), 400

        conn = conectar()
        cursor = conn.cursor()
        
        # Buscar ID do destinatário pelo nome
        print(f"Buscando ID para o usuário: {destinatario_nome}")
        cursor.execute("SELECT id FROM usuarios WHERE nome=?", (destinatario_nome,))
        destinatario = cursor.fetchone()
        
        if not destinatario:
            print(f"Destinatário não encontrado: {destinatario_nome}")
            conn.close()
            return jsonify({"status": "erro", "mensagem": "Destinatário não encontrado"}), 404
        
        destinatario_id = destinatario[0]
        print(f"ID do destinatário: {destinatario_id}")
        
        # Inserir mensagem (sem data_envio por enquanto)
        print(f"Inserindo mensagem: remetente={session['user_id']}, destinatario={destinatario_id}")
        
        cursor.execute("""
        INSERT INTO mensagens (remetente_id, destinatario_id, mensagem)
        VALUES (?, ?, ?)
        """, (
            session["user_id"],
            destinatario_id,
            mensagem_texto
        ))

        conn.commit()
        print("Mensagem inserida com sucesso!")
        
        # Verificar se a mensagem foi inserida
        cursor.execute("SELECT last_insert_rowid()")
        last_id = cursor.fetchone()[0]
        print(f"ID da mensagem inserida: {last_id}")
        
        conn.close()
        print("=== ENVIO CONCLUÍDO COM SUCESSO ===")
        return jsonify({"status": "ok"})
        
    except Exception as e:
        print(f"ERRO em /enviar: {str(e)}")
        traceback.print_exc()
        return jsonify({"status": "erro", "mensagem": str(e)}), 500


# -----------------------
# BUSCAR MENSAGENS
# -----------------------

@app.route("/mensagens")
def mensagens():
    try:
        print("=== BUSCANDO MENSAGENS ===")
        
        if "user_id" not in session:
            print("Usuário não autenticado")
            return jsonify({"erro": "Não autorizado"}), 401
        
        destinatario_nome = request.args.get("user2")
        print(f"Buscando mensagens com: {destinatario_nome}")
        
        if not destinatario_nome:
            print("Destinatário não especificado")
            return jsonify({"erro": "Destinatário não especificado"}), 400
        
        conn = conectar()
        cursor = conn.cursor()
        
        # Primeiro, pegar o ID do destinatário pelo nome
        print(f"Buscando ID do destinatário: {destinatario_nome}")
        cursor.execute("SELECT id FROM usuarios WHERE nome=?", (destinatario_nome,))
        destinatario = cursor.fetchone()
        
        if not destinatario:
            print(f"Destinatário não encontrado: {destinatario_nome}")
            conn.close()
            return jsonify([])
        
        destinatario_id = destinatario[0]
        print(f"ID do destinatário: {destinatario_id}")
        
        # Verificar se a coluna data_envio existe
        cursor.execute("PRAGMA table_info(mensagens)")
        colunas = cursor.fetchall()
        tem_data_envio = 'data_envio' in [coluna[1] for coluna in colunas]
        
        # Agora buscar as mensagens
        print(f"Buscando mensagens entre {session['user_id']} e {destinatario_id}")
        
        if tem_data_envio:
            cursor.execute("""
            SELECT remetente_id, mensagem, data_envio
            FROM mensagens
            WHERE (remetente_id=? AND destinatario_id=?)
            OR (remetente_id=? AND destinatario_id=?)
            ORDER BY id
            """, (
                session["user_id"], destinatario_id,
                destinatario_id, session["user_id"]
            ))
        else:
            cursor.execute("""
            SELECT remetente_id, mensagem, '' as data_envio
            FROM mensagens
            WHERE (remetente_id=? AND destinatario_id=?)
            OR (remetente_id=? AND destinatario_id=?)
            ORDER BY id
            """, (
                session["user_id"], destinatario_id,
                destinatario_id, session["user_id"]
            ))
        
        msgs = cursor.fetchall()
        print(f"Encontradas {len(msgs)} mensagens")
        
        lista = []
        for m in msgs:
            remetente = "eu" if m[0] == session["user_id"] else destinatario_nome
            lista.append({
                "remetente": remetente,
                "mensagem": m[1],
                "data": m[2] if len(m) > 2 and m[2] else ""
            })
        
        conn.close()
        print("=== BUSCA CONCLUÍDA ===")
        return jsonify(lista)
        
    except Exception as e:
        print(f"ERRO em /mensagens: {str(e)}")
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# -----------------------
# CONVERSAS
# -----------------------

@app.route("/conversas")
def conversas():
    try:
        print("=== BUSCANDO CONVERSAS ===")
        
        if "user_id" not in session:
            return jsonify([]), 401
        
        usuario_id = session["user_id"]
        print(f"Buscando conversas para usuário ID: {usuario_id}")
        
        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
        SELECT DISTINCT u.id, u.nome
        FROM mensagens m
        JOIN usuarios u ON (u.id = m.remetente_id OR u.id = m.destinatario_id)
        WHERE (m.remetente_id = ? OR m.destinatario_id = ?) AND u.id != ?
        ORDER BY u.nome
        """, (usuario_id, usuario_id, usuario_id))

        dados = cursor.fetchall()
        print(f"Encontradas {len(dados)} conversas")
        
        conn.close()
        
        return jsonify([{"id": c[0], "nome": c[1]} for c in dados])
        
    except Exception as e:
        print(f"ERRO em /conversas: {str(e)}")
        traceback.print_exc()
        return jsonify([]), 500


# -----------------------
# LOGOUT
# -----------------------

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


if __name__ == "__main__":
    # Inicializar banco de dados
    init_db()
    
    app.run(debug=True, host='127.0.0.1', port=5000)