// Inicializa as variáveis
let bancoDeProdutos = {
    "7898936576057": "Água Mineral",
    "7891008121096": "Achocolatado Nescau 400g"
};
let carrinhoDeCompras = [];
let historicoDeCompras = []; 

// ==========================================
// NOVIDADE: O "CADEADO" DA CÂMERA
// ==========================================
let processandoItem = false;

// Função que destranca o aplicativo para o próximo produto
function liberarCamera() {
    processandoItem = false;
    document.getElementById('codigo-lido').innerText = "Aguardando próximo item...";
}
// ==========================================

function salvarDados() {
    localStorage.setItem('meuCarrinho', JSON.stringify(carrinhoDeCompras));
    localStorage.setItem('meuBancoProdutos', JSON.stringify(bancoDeProdutos));
    localStorage.setItem('meuLimite', document.getElementById('limite-orcamento').value);
    localStorage.setItem('meuHistorico', JSON.stringify(historicoDeCompras)); 
}

function carregarDados() {
    let carrinhoSalvo = localStorage.getItem('meuCarrinho');
    let bancoSalvo = localStorage.getItem('meuBancoProdutos');
    let limiteSalvo = localStorage.getItem('meuLimite');
    let historicoSalvo = localStorage.getItem('meuHistorico'); 

    if (carrinhoSalvo) carrinhoDeCompras = JSON.parse(carrinhoSalvo);
    if (bancoSalvo) bancoDeProdutos = {...bancoDeProdutos, ...JSON.parse(bancoSalvo)}; 
    if (limiteSalvo) document.getElementById('limite-orcamento').value = limiteSalvo;
    if (historicoSalvo) historicoDeCompras = JSON.parse(historicoSalvo);

    atualizarTelaDoCarrinho();
}

function finalizarCompra() {
    if (carrinhoDeCompras.length === 0) {
        alert("O carrinho está vazio! Adicione itens antes de finalizar.");
        return;
    }
    let confirmacao = confirm("Deseja finalizar esta compra?");
    if (confirmacao) {
        let totalCompra = carrinhoDeCompras.reduce((acc, item) => acc + item.subtotal, 0);
        let dataAtual = new Date().toLocaleString('pt-BR');

        historicoDeCompras.unshift({
            data: dataAtual, total: totalCompra, itens: [...carrinhoDeCompras] 
        });

        carrinhoDeCompras = [];
        atualizarTelaDoCarrinho(); 
        alert("Compra finalizada com sucesso! Verifique o Histórico.");
    }
}

function abrirHistorico() {
    let modal = document.getElementById('modal-historico');
    let lista = document.getElementById('lista-historico');
    lista.innerHTML = ""; 
    
    if (historicoDeCompras.length === 0) {
        lista.innerHTML = "<p style='text-align: center; color: #777;'>Nenhuma compra finalizada.</p>";
    } else {
        historicoDeCompras.forEach((compra, index) => {
            let htmlItens = compra.itens.map(i => 
                `<li style="margin-bottom: 5px;">${i.quantidade}x ${i.nome} - R$ ${i.subtotal.toFixed(2).replace('.', ',')}</li>`
            ).join('');
            
            let card = document.createElement('div');
            card.className = "compra-card";
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 10px;">
                    <div style="font-weight: bold; color: #2a5298; font-size: 14px;">📅 ${compra.data}</div>
                    <button onclick="apagarCompraDoHistorico(${index})" style="background: none; border: none; color: #ff4d4d; cursor: pointer; font-size: 16px;" title="Excluir Compra">🗑️</button>
                </div>
                <ul style="margin: 0 0 10px 0; padding-left: 20px; font-size: 14px; color: #555;">${htmlItens}</ul>
                <div style="text-align: right; font-weight: bold; color: #d9534f; font-size: 16px;">Total Pago: R$ ${compra.total.toFixed(2).replace('.', ',')}</div>
            `;
            lista.appendChild(card);
        });
    }
    modal.style.display = 'block';
}

function apagarCompraDoHistorico(index) {
    let confirmacao = confirm("Tem certeza que deseja excluir esta compra do seu histórico?");
    if (confirmacao) {
        historicoDeCompras.splice(index, 1);
        salvarDados(); 
        abrirHistorico(); 
    }
}

function fecharHistorico() { document.getElementById('modal-historico').style.display = 'none'; }

function mudarQuantidade(valor) {
    let inputQtd = document.getElementById('quantidade-item');
    let novaQtd = parseInt(inputQtd.value) + valor;
    if (novaQtd >= 1) inputQtd.value = novaQtd;
}

function processarCodigo(codigo) {
    document.getElementById('resultado-area').style.display = 'block';
    document.getElementById('codigo-lido').innerText = codigo + " (Buscando...)";
    let quantidade = parseInt(document.getElementById('quantidade-item').value) || 1;
    
    try { let beep = new Audio('https://www.soundjay.com/buttons/sounds/beep-07.mp3'); beep.play(); } catch(e) {}

    let nomeProduto = bancoDeProdutos[codigo];
    
    if (nomeProduto) {
        document.getElementById('codigo-lido').innerText = codigo;
        let itemJaExiste = carrinhoDeCompras.find(item => item.codigo === codigo);
        if (itemJaExiste) {
            alterarItemNoCarrinho(codigo, quantidade);
            alert(`Mais ${quantidade}x ${nomeProduto} adicionado(s)!`);
            document.getElementById('quantidade-item').value = 1;
            liberarCamera(); // DESTRANCA O CADEADO AQUI
        } else {
            pedirPreco(codigo, nomeProduto, quantidade);
        }
    } else {
        fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`)
            .then(resposta => resposta.json())
            .then(dados => {
                document.getElementById('codigo-lido').innerText = codigo;
                if (dados.status === 1 && dados.product.product_name) {
                    let nomeDaApi = dados.product.product_name;
                    if(dados.product.brands) {
                        nomeDaApi += ` (${dados.product.brands.split(',')[0]})`;
                    }
                    bancoDeProdutos[codigo] = nomeDaApi;
                    salvarDados();
                    pedirPreco(codigo, nomeDaApi, quantidade);
                } else {
                    pedirNomeManual(codigo, quantidade);
                }
            })
            .catch(erro => {
                document.getElementById('codigo-lido').innerText = codigo;
                pedirNomeManual(codigo, quantidade);
            });
    }
}

function pedirPreco(codigo, nome, quantidade) {
    setTimeout(() => {
        let precoDigitado = prompt(`Encontramos na rede: ${nome}!\nPreço unitário:`);
        if (precoDigitado) {
            let precoFormatado = precoDigitado.replace(',', '.');
            if (!isNaN(precoFormatado) && precoFormatado.trim() !== "") {
                adicionarAoCarrinho(codigo, nome, parseFloat(precoFormatado), quantidade);
            } else {
                alert("Valor inválido! Tente novamente.");
            }
        }
        liberarCamera(); // DESTRANCA O CADEADO AQUI MESMO SE CANCELAR
    }, 300);
}

function pedirNomeManual(codigo, quantidade) {
    setTimeout(() => {
        let nomeDigitado = prompt(`Produto novo na rede!\nQual o nome do item?`);
        if (nomeDigitado) {
            let precoDigitado = prompt(`Qual o preço unitário do(a) ${nomeDigitado}?`);
            if (precoDigitado) {
                let precoFormatado = precoDigitado.replace(',', '.');
                if (!isNaN(precoFormatado) && precoFormatado.trim() !== "") {
                    bancoDeProdutos[codigo] = nomeDigitado;
                    salvarDados();
                    adicionarAoCarrinho(codigo, nomeDigitado, parseFloat(precoFormatado), quantidade);
                } else {
                    alert("Valor inválido! Tente novamente.");
                }
            }
        }
        liberarCamera(); // DESTRANCA O CADEADO AQUI MESMO SE CANCELAR
    }, 300);
}

function adicionarAoCarrinho(codigo, nome, precoUnitario, quantidade) {
    carrinhoDeCompras.push({
        codigo: codigo, nome: nome, precoUnitario: precoUnitario,
        quantidade: quantidade, subtotal: precoUnitario * quantidade
    });
    atualizarTelaDoCarrinho();
    document.getElementById('quantidade-item').value = 1;
}

function alterarItemNoCarrinho(codigo, mudanca) {
    let item = carrinhoDeCompras.find(i => i.codigo === codigo);
    if (item) {
        item.quantidade += mudanca;
        if (item.quantidade <= 0) {
            carrinhoDeCompras = carrinhoDeCompras.filter(i => i.codigo !== codigo);
        } else {
            item.subtotal = item.quantidade * item.precoUnitario;
        }
        atualizarTelaDoCarrinho();
    }
}

function atualizarTelaDoCarrinho() {
    let lista = document.getElementById('itens-carrinho');
    lista.innerHTML = ""; 
    let totalGeral = 0;

    carrinhoDeCompras.forEach(item => {
        totalGeral += item.subtotal;
        let li = document.createElement('li');
        li.style.padding = "10px 0";
        li.style.borderBottom = "1px solid #eee";
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        
        li.innerHTML = `
            <div style="flex: 1; text-align: left;">
                <span style="display: block; font-weight: bold; color: #333;">${item.nome}</span>
                <span style="font-size: 12px; color: #777;">R$ ${item.precoUnitario.toFixed(2).replace('.', ',')} un.</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 0 10px;">
                <button onclick="alterarItemNoCarrinho('${item.codigo}', -1)" style="width: 28px; height: 28px; background: #ff4d4d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">-</button>
                <span style="font-weight: bold; width: 20px; text-align: center;">${item.quantidade}</span>
                <button onclick="alterarItemNoCarrinho('${item.codigo}', 1)" style="width: 28px; height: 28px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">+</button>
            </div>
            <strong style="min-width: 80px; text-align: right;">R$ ${item.subtotal.toFixed(2).replace('.', ',')}</strong>
        `;
        lista.appendChild(li);
    });

    document.getElementById('valor-total').innerText = totalGeral.toFixed(2).replace('.', ',');

    let limite = parseFloat(document.getElementById('limite-orcamento').value) || 0;
    let carrinhoDiv = document.getElementById('carrinho');
    let textoTotal = document.getElementById('texto-total');

    if (limite > 0 && totalGeral > limite) {
        carrinhoDiv.classList.add('alerta-estourou');
        textoTotal.style.color = "red";
    } else {
        carrinhoDiv.classList.remove('alerta-estourou');
        textoTotal.style.color = "#333";
    }
    salvarDados();
}

// ==========================================
// MUDANÇA AQUI: O CADEADO AGINDO NA LEITURA
// ==========================================
function onScanSuccess(decodedText) { 
    if (processandoItem) return; // Se estiver trancado, ignora as leituras repetidas!
    processandoItem = true;      // Se passou, tranca a porta!
    processarCodigo(decodedText); 
}

function onScanFailure(error) { }

function buscarManual() {
    const codigoDigitado = document.getElementById('codigo-manual').value;
    if(codigoDigitado.trim() !== "") {
        if (processandoItem) return; // Cadeado para digitação rápida também
        processandoItem = true;
        processarCodigo(codigoDigitado);
        document.getElementById('codigo-manual').value = ""; 
    } else { alert("Digite o código de barras primeiro."); }
}

carregarDados();

// Forçando a câmera traseira
let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", 
    { 
        fps: 10, 
        qrbox: {width: 250, height: 150},
        videoConstraints: { facingMode: "environment" } 
    }, 
    false
);
html5QrcodeScanner.render(onScanSuccess, onScanFailure);

// Tradução do Scanner
setInterval(() => {
    const btnPermissao = document.getElementById('html5-qrcode-button-camera-permission');
    if (btnPermissao && btnPermissao.innerText.includes('Request Camera Permissions')) {
        btnPermissao.innerText = 'Permitir Acesso à Câmera';
    }
    const btnIniciar = document.getElementById('html5-qrcode-button-camera-start');
    if (btnIniciar && btnIniciar.innerText.includes('Start Scanning')) {
        btnIniciar.innerText = 'Ligar Câmera';
    }
    const btnParar = document.getElementById('html5-qrcode-button-camera-stop');
    if (btnParar && btnParar.innerText.includes('Stop Scanning')) {
        btnParar.innerText = 'Desligar Câmera';
    }
    const linkArquivo = document.getElementById('html5-qrcode-anchor-scan-type-change');
    if (linkArquivo && linkArquivo.innerText.includes('Scan an Image File')) {
        linkArquivo.innerText = 'Escanear imagem da galeria';
    } else if (linkArquivo && linkArquivo.innerText.includes('Scan using camera directly')) {
        linkArquivo.innerText = 'Escanear usando a câmera';
    }
}, 1000);

// ==========================================
// MÁGICA DE INSTALAÇÃO DO APLICATIVO (PWA)
// ==========================================
let eventoInstalacao;
const btnInstalar = document.getElementById('btn-instalar');

// O navegador avisa: "Ei, estou pronto para instalar!"
window.addEventListener('beforeinstallprompt', (e) => {
    // 1. Impede o Chrome de mostrar a barrinha padrão chata
    e.preventDefault();
    // 2. Guarda o evento mágico para usarmos depois
    eventoInstalacao = e;
    // 3. Mostra o nosso botão roxo bonitão!
    if (btnInstalar) {
        btnInstalar.style.display = 'block';
    }
});

// Quando o usuário clicar no nosso botão roxo:
if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (!eventoInstalacao) return;
        
        // Dispara o alerta de instalação nativo do celular (Aquele que diz "Adicionar à tela inicial?")
        eventoInstalacao.prompt();
        
        // Espera o usuário clicar em "Instalar" ou "Cancelar"
        const { outcome } = await eventoInstalacao.userChoice;
        
        if (outcome === 'accepted') {
            // Se ele instalou, a gente esconde o botão para não atrapalhar mais a tela
            btnInstalar.style.display = 'none';
        }
        
        // Limpa a memória
        eventoInstalacao = null; 
    });
}