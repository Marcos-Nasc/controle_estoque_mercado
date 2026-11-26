
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

produtos = {
    1: {"nome": "Arroz 5kg", "categoria": "Alimentos", "quantidade": 35, "estoque_minimo": 10},
    2: {"nome": "Feijao 1kg", "categoria": "Alimentos", "quantidade": 8, "estoque_minimo": 15},
    3: {"nome": "Leite 1L", "categoria": "Bebidas", "quantidade": 3, "estoque_minimo": 20},
    4: {"nome": "Cafe 500g", "categoria": "Alimentos", "quantidade": 18, "estoque_minimo": 10},
    5: {"nome": "Acucar 1kg", "categoria": "Alimentos", "quantidade": 25, "estoque_minimo": 10},
    6: {"nome": "Oleo 900ml", "categoria": "Alimentos", "quantidade": 12, "estoque_minimo": 10},
    7: {"nome": "Sabao em Po", "categoria": "Higiene", "quantidade": 7, "estoque_minimo": 10},
    8: {"nome": "Papel Higienico", "categoria": "Higiene", "quantidade": 30, "estoque_minimo": 15},
    9: {"nome": "Refrigerante 2L", "categoria": "Bebidas", "quantidade": 22, "estoque_minimo": 10},
    10: {"nome": "Agua 1,5L", "categoria": "Bebidas", "quantidade": 5, "estoque_minimo": 10},
}

movimentacoes = []

def registrar_movimentacao(codigo, tipo, quantidade):
    movimentacoes.append({
        "produto": produtos[codigo]["nome"],
        "codigo": codigo,
        "tipo": tipo,
        "quantidade": quantidade
    })

def status_produto(produto):
    q = produto["quantidade"]
    minimo = produto["estoque_minimo"]
    if q == 0:
        return "EM FALTA"
    if q <= minimo:
        return "CRITICO"
    return "NORMAL"

def produtos_criticos():
    return [
        {
            "codigo": codigo,
            "nome": produto["nome"],
            "categoria": produto["categoria"],
            "quantidade": produto["quantidade"],
            "minimo": produto["estoque_minimo"],
            "status": status_produto(produto)
        }
        for codigo, produto in produtos.items()
        if produto["quantidade"] <= produto["estoque_minimo"]
    ]

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/estoque")
def estoque():
    lista = []
    for codigo, produto in produtos.items():
        lista.append({
            "codigo": codigo,
            **produto,
            "status": status_produto(produto)
        })
    return jsonify(lista)

@app.get("/api/resumo")
def resumo():
    criticos = produtos_criticos()
    em_falta = [p for p in produtos.values() if p["quantidade"] == 0]
    total_unidades = sum(p["quantidade"] for p in produtos.values())
    entradas = sum(m["quantidade"] for m in movimentacoes if m["tipo"] == "entrada")
    saidas = sum(m["quantidade"] for m in movimentacoes if m["tipo"] == "saida")

    categorias = {}
    for p in produtos.values():
        cat = p["categoria"]
        categorias.setdefault(cat, 0)
        categorias[cat] += p["quantidade"]

    return jsonify({
        "produtos": len(produtos),
        "unidades": total_unidades,
        "criticos": len(criticos),
        "em_falta": len(em_falta),
        "entradas": entradas,
        "saidas": saidas,
        "categorias": categorias
    })

@app.get("/api/movimentacoes")
def get_movimentacoes():
    return jsonify(list(reversed(movimentacoes)))

@app.post("/api/movimentacao")
def movimentacao():
    data = request.get_json(silent=True) or {}
    codigo = int(data.get("codigo", 0))
    tipo = data.get("tipo")
    quantidade = int(data.get("quantidade", 0))

    if codigo not in produtos:
        return jsonify({"erro": "Produto nao encontrado."}), 404
    if tipo not in ("entrada", "saida"):
        return jsonify({"erro": "Tipo de movimentacao invalido."}), 400
    if quantidade <= 0:
        return jsonify({"erro": "A quantidade deve ser maior que zero."}), 400

    if tipo == "saida" and produtos[codigo]["quantidade"] < quantidade:
        return jsonify({"erro": "Estoque insuficiente."}), 400

    if tipo == "entrada":
        produtos[codigo]["quantidade"] += quantidade
    else:
        produtos[codigo]["quantidade"] -= quantidade

    registrar_movimentacao(codigo, tipo, quantidade)
    return jsonify({
        "mensagem": "Movimentacao registrada com sucesso.",
        "produto": produtos[codigo],
        "status": status_produto(produtos[codigo])
    })

@app.post("/api/produto")
def cadastrar():
    data = request.get_json(silent=True) or {}
    try:
        codigo = int(data["codigo"])
        quantidade = int(data["quantidade"])
        minimo = int(data["estoque_minimo"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"erro": "Preencha todos os campos corretamente."}), 400

    if codigo in produtos:
        return jsonify({"erro": "Esse codigo ja esta cadastrado."}), 400
    if not data.get("nome") or not data.get("categoria"):
        return jsonify({"erro": "Nome e categoria sao obrigatorios."}), 400
    if quantidade < 0 or minimo < 0:
        return jsonify({"erro": "Quantidade e estoque minimo nao podem ser negativos."}), 400

    produtos[codigo] = {
        "nome": data["nome"].strip(),
        "categoria": data["categoria"].strip(),
        "quantidade": quantidade,
        "estoque_minimo": minimo
    }
    return jsonify({"mensagem": "Produto cadastrado com sucesso."})

@app.put("/api/produto/<int:codigo>")
def editar_produto(codigo):
    if codigo not in produtos:
        return jsonify({"erro": "Produto nao encontrado."}), 404

    data = request.get_json(silent=True) or {}

    if not data.get("nome") or not data.get("categoria"):
        return jsonify({"erro": "Nome e categoria sao obrigatorios."}), 400

    try:
        quantidade = int(data["quantidade"])
        minimo = int(data["estoque_minimo"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"erro": "Preencha todos os campos corretamente."}), 400

    if quantidade < 0 or minimo < 0:
        return jsonify({
            "erro": "Quantidade e estoque minimo nao podem ser negativos."
        }), 400

    produtos[codigo]["nome"] = data["nome"].strip()
    produtos[codigo]["categoria"] = data["categoria"].strip()
    produtos[codigo]["quantidade"] = quantidade
    produtos[codigo]["estoque_minimo"] = minimo

    return jsonify({
        "mensagem": "Produto atualizado com sucesso."
    })


@app.delete("/api/produto/<int:codigo>")
def excluir_produto(codigo):
    if codigo not in produtos:
        return jsonify({"erro": "Produto nao encontrado."}), 404

    nome = produtos[codigo]["nome"]

    del produtos[codigo]

    return jsonify({
        "mensagem": f"Produto {nome} excluido com sucesso."
    })

if __name__ == "__main__":
    app.run(debug=True)
