
let estoque = [];

async function api(url, options={}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || "Ocorreu um erro.");
  return data;
}

function statusClass(status){
  if(status === "NORMAL") return "status-normal";
  if(status === "CRITICO") return "status-critico";
  return "status-falta";
}
function statusLabel(status){
  return status === "CRITICO" ? "CRÍTICO" : status;
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

async function carregarTudo(){
  try{
    estoque = await api("/api/estoque");
    const resumo = await api("/api/resumo");
    const movs = await api("/api/movimentacoes");
    document.getElementById("totalProdutos").textContent = resumo.produtos;
    document.getElementById("totalUnidades").textContent = resumo.unidades;
    document.getElementById("totalCriticos").textContent = resumo.criticos;
    document.getElementById("totalFalta").textContent = resumo.em_falta;
    renderEstoque();
    renderMovs(movs);
    renderCategorias(resumo.categorias);
    preencherProdutos();
  }catch(e){toast(e.message,true)}
}

function renderEstoque(){

  const busca = (document.getElementById("busca").value || "").toLowerCase();
  const filtro = document.getElementById("filtro").value;

  const dados = estoque.filter(p =>
    (
      p.nome.toLowerCase().includes(busca) ||
      p.categoria.toLowerCase().includes(busca)
    ) &&
    (filtro === "todos" || p.status === filtro)
  );

  document.getElementById("tabelaEstoque").innerHTML =
    dados.map(p => `

      <tr>

        <td>
          <div class="product-name">${esc(p.nome)}</div>
          <div class="product-code">#${p.codigo}</div>
        </td>

        <td>${esc(p.categoria)}</td>

        <td>
          <strong>${p.quantidade}</strong> un.
        </td>

        <td>
          ${p.estoque_minimo} un.
        </td>

        <td>
          <span class="badge-status ${statusClass(p.status)}">
            ${statusLabel(p.status)}
          </span>
        </td>

        <td class="text-end">

          <button
            class="btn btn-sm btn-light rounded-3 me-1"
            onclick="abrirMov(${p.codigo})"
            title="Registrar movimentação">

            <i class="bi bi-arrow-left-right"></i>

          </button>

          <button
            class="btn btn-sm btn-light rounded-3 me-1"
            onclick="abrirEditar(${p.codigo})"
            title="Editar produto">

            <i class="bi bi-pencil"></i>

          </button>

          <button
            class="btn btn-sm btn-light rounded-3 text-danger"
            onclick="excluirProduto(${p.codigo})"
            title="Excluir produto">

            <i class="bi bi-trash"></i>

          </button>

        </td>

      </tr>

    `).join("") ||

    `
      <tr>
        <td colspan="6"
            class="text-center py-5 text-muted">

          Nenhum produto encontrado.

        </td>
      </tr>
    `;
}

function renderMovs(movs){
  document.getElementById("tabelaMov").innerHTML = movs.length ? movs.slice(0,12).map(m=>`
    <tr><td><span class="badge-status ${m.tipo==="entrada"?"status-normal":"status-critico"}">${m.tipo==="entrada"?"ENTRADA":"SAÍDA"}</span></td><td class="product-name">${esc(m.produto)}</td><td>${m.quantidade} un.</td></tr>`).join("") :
    `<tr><td colspan="3" class="text-center py-5 text-muted">Nenhuma movimentação registrada.</td></tr>`;
}

function renderCategorias(cats){
  document.getElementById("categorias").innerHTML = Object.entries(cats).map(([cat,q])=>`
    <div class="col-12 col-md-4"><div class="category-card"><h4>${esc(cat)}</h4><strong>${q}</strong><small class="d-block">unidades em estoque</small></div></div>`).join("");
}

function preencherProdutos(){
  document.getElementById("movCodigo").innerHTML=estoque.map(p=>`<option value="${p.codigo}">${esc(p.nome)} — ${p.quantidade} un.</option>`).join("");
}
function abrirMov(codigo){
  document.getElementById("movCodigo").value=codigo;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("movModal")).show();
}

async function registrarMov(e){
  e.preventDefault();
  const tipo=document.querySelector('input[name="tipo"]:checked').value;
  const codigo=Number(document.getElementById("movCodigo").value);
  const quantidade=Number(document.getElementById("movQuantidade").value);
  try{
    const r=await api("/api/movimentacao",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({codigo,tipo,quantidade})});
    toast(r.mensagem);
    e.target.reset();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("movModal")).hide();
    carregarTudo();
  }catch(err){toast(err.message,true)}
}

async function cadastrarProduto(e){
  e.preventDefault();
  const data={
    codigo:Number(document.getElementById("pCodigo").value),
    nome:document.getElementById("pNome").value,
    categoria:document.getElementById("pCategoria").value,
    quantidade:Number(document.getElementById("pQuantidade").value),
    estoque_minimo:Number(document.getElementById("pMinimo").value)
  };
  try{
    const r=await api("/api/produto",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    toast(r.mensagem);
    e.target.reset();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("produtoModal")).hide();
    carregarTudo();
  }catch(err){toast(err.message,true)}
}

function abrirEditar(codigo){

  const produto = estoque.find(p => p.codigo === codigo);

  if(!produto){
    toast("Produto nao encontrado.", true);
    return;
  }

  document.getElementById("eCodigo").value = produto.codigo;
  document.getElementById("eNome").value = produto.nome;
  document.getElementById("eCategoria").value = produto.categoria;
  document.getElementById("eQuantidade").value = produto.quantidade;
  document.getElementById("eMinimo").value = produto.estoque_minimo;

  bootstrap.Modal
    .getOrCreateInstance(
      document.getElementById("editarProdutoModal")
    )
    .show();
}


async function salvarEdicao(e){

  e.preventDefault();

  const codigo = Number(
    document.getElementById("eCodigo").value
  );

  const data = {

    nome: document.getElementById("eNome").value,

    categoria: document.getElementById("eCategoria").value,

    quantidade: Number(
      document.getElementById("eQuantidade").value
    ),

    estoque_minimo: Number(
      document.getElementById("eMinimo").value
    )

  };

  try{

    const r = await api(
      `/api/produto/${codigo}`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(data)
      }
    );

    toast(r.mensagem);

    bootstrap.Modal
      .getOrCreateInstance(
        document.getElementById("editarProdutoModal")
      )
      .hide();

    await carregarTudo();

  }catch(err){

    toast(err.message, true);

  }
}

async function excluirProduto(codigo){

  const produto = estoque.find(p => p.codigo === codigo);

  if(!produto){
    toast("Produto nao encontrado.", true);
    return;
  }

  const confirmar = confirm(
    `Tem certeza que deseja excluir o produto "${produto.nome}"?`
  );

  if(!confirmar){
    return;
  }

  try{

    const r = await api(
      `/api/produto/${codigo}`,
      {
        method: "DELETE"
      }
    );

    toast(r.mensagem);

    await carregarTudo();

  }catch(err){

    toast(err.message, true);

  }
}

function toast(msg, danger=false){
  const el=document.getElementById("toast");
  document.getElementById("toastText").innerHTML=`<i class="bi ${danger?"bi-x-circle":"bi-check-circle"} me-2"></i>${esc(msg)}`;
  el.classList.toggle("text-danger",danger);
  bootstrap.Toast.getOrCreateInstance(el,{delay:2600}).show();
}

document.addEventListener("DOMContentLoaded", carregarTudo);
