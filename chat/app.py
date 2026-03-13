from flask import Flask, render_template, request, redirect, session, jsonify
import sqlite3
from datetime import datetime

app = Flask(__name__)
app.secret_key = "segredo123"

DB = "chat.db"


def conectar():
    return sqlite3.connect(DB)


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

    cursor.execute(
        "SELECT id, senha FROM usuarios WHERE nome=?",
        (nome,)
    )

    user = cursor.fetchone()

    if user is None:

        cursor.execute(
            "INSERT INTO usuarios (nome, senha) VALUES (?, ?)",
            (nome, senha)
        )

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

    return render_template(
        "chat.html",
        nome=session["nome"],
        usuario_id=session["user_id"]
    )


# -----------------------
# LISTAR USUARIOS
# -----------------------

@app.route("/usuarios")
def usuarios():

    if "user_id" not in session:
        return jsonify([])

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, nome FROM usuarios WHERE id != ?",
        (session["user_id"],)
    )

    lista = cursor.fetchall()

    conn.close()

    return jsonify(lista)


# -----------------------
# ENVIAR MENSAGEM
# -----------------------

@app.route("/enviar", methods=["POST"])
def enviar():

    if "user_id" not in session:
        return jsonify({"status": "erro"})

    data = request.get_json()

    destinatario = data["destinatario"]
    texto = data["texto"]

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO mensagens (remetente_id, destinatario_id, mensagem)
    VALUES (?, ?, ?)
    """, (
        session["user_id"],
        destinatario,
        texto
    ))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

# -----------------------
# BUSCAR MENSAGENS
# -----------------------

@app.route("/mensagens/<int:dest>")
def mensagens(dest):

    if "user_id" not in session:
        return jsonify([])

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT remetente_id, mensagem
    FROM mensagens
    WHERE (remetente_id=? AND destinatario_id=?)
    OR (remetente_id=? AND destinatario_id=?)
    ORDER BY id
    """, (
        session["user_id"], dest,
        dest, session["user_id"]
    ))

    msgs = cursor.fetchall()

    lista = []

    for m in msgs:
        lista.append({
            "remetente": m[0],
            "mensagem": m[1]
        })

    conn.close()

    return jsonify(lista)


# -----------------------
# BUSCAR USUARIO
# -----------------------

@app.route("/buscar_usuario/<nome>")
def buscar_usuario(nome):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, nome
    FROM usuarios
    WHERE nome LIKE ?
    """, (f"%{nome}%",))

    users = cursor.fetchall()

    conn.close()

    lista = []

    for u in users:
        lista.append({
            "id": u[0],
            "nome": u[1]
        })

    return jsonify(lista)


# -----------------------
# CONVERSAS
# -----------------------

@app.route("/conversas/<int:usuario_id>")
def conversas(usuario_id):

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT DISTINCT usuarios.id, usuarios.nome
    FROM mensagens
    JOIN usuarios 
    ON usuarios.id = mensagens.remetente_id 
    OR usuarios.id = mensagens.destinatario_id
    WHERE usuarios.id != ?
    """, (usuario_id,))

    dados = cursor.fetchall()

    lista = []

    for c in dados:
        lista.append({
            "id": c[0],
            "nome": c[1]
        })

    conn.close()

    return jsonify(lista)


if __name__ == "__main__":
    app.run(debug=True)