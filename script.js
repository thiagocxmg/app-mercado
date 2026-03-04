// Inicializa as variáveis
        let bancoDeProdutos = {
            "7898936576057": "Água Mineral",
            "7891008121096": "Achocolatado Nescau 400g"
        };
        let carrinhoDeCompras = [];
        let historicoDeCompras = []; 

        // --- FUNÇÕES DE PERSISTÊNCIA (A memória do APP) ---
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

        // --- FUNÇÕES DO HISTÓRICO E FINALIZAÇÃO ---
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
                    data: dataAtual,
                    total: totalCompra,
                    itens: [...carrinhoDeCompras] 
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
                historicoDeCompras.forEach(compra => {
                    let htmlItens = compra.itens.map(i => 
                        `<li style="margin-bottom: 5px;">${i.quantidade}x ${i.nome} - R$ ${i.subtotal.toFixed(2).replace('.', ',')}</li>`
                    ).join('');
                    
                    let card = document.createElement('div');
                    card.className = "compra-card";
                    card.innerHTML = `
                        <div class="compra-data">📅 ${compra.data}</div>
                        <ul style="margin: 0 0 10px 0; padding-left: 20px; font-size: 14px; color: #555;">${htmlItens}</ul>
                        <div style="text-align: right; font-weight: bold; color: #d9534f; font-size: 16px;">Total Pago: R$ ${compra.total.toFixed(2).replace('.', ',')}</div>
                    `;
                    lista.appendChild(card);
                });
            }
            modal.style.display = 'block';
        }

        function fecharHistorico() { document.getElementById('modal-historico').style.display = 'none'; }

        function mudarQuantidade(valor) {
            let inputQtd = document.getElementById('quantidade-item');
            let novaQtd = parseInt(inputQtd.value) + valor;
            if (novaQtd >= 1) inputQtd.value = novaQtd;
        }

        // --- A NOVA LÓGICA COM A API DA INTERNET ---
        function processarCodigo(codigo) {
            document.getElementById('resultado-area').style.display = 'block';
            document.getElementById('codigo-lido').innerText = codigo + " (Buscando...)";
            let quantidade = parseInt(document.getElementById('quantidade-item').value) || 1;
            
            try { let beep = new Audio('https://www.soundjay.com/buttons/sounds/beep-07.mp3'); beep.play(); } catch(e) {}

            // 1. O app já aprendeu esse código antes?
            let nomeProduto = bancoDeProdutos[codigo];
            
            if (nomeProduto) {
                document.getElementById('codigo-lido').innerText = codigo;
                let itemJaExiste = carrinhoDeCompras.find(item => item.codigo === codigo);
                if (itemJaExiste) {
                    alterarItemNoCarrinho(codigo, quantidade);
                    alert(`Mais ${quantidade}x ${nomeProduto} adicionado(s)!`);
                    document.getElementById('quantidade-item').value = 1;
                } else {
                    pedirPreco(codigo, nomeProduto, quantidade);
                }
            } else {
                // 2. Não conhecemos! Vamos consultar a API da Open Food Facts usando o fetch()
                fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`)
                    .then(resposta => resposta.json())
                    .then(dados => {
                        document.getElementById('codigo-lido').innerText = codigo;
                        
                        // Status 1 significa que a API achou o produto no banco deles!
                        if (dados.status === 1 && dados.product.product_name) {
                            let nomeDaApi = dados.product.product_name;
                            
                            // Se tiver a marca cadastrada, a gente junta pra ficar mais completo
                            if(dados.product.brands) {
                                nomeDaApi += ` (${dados.product.brands.split(',')[0]})`;
                            }

                            // Salva no nosso caderninho para não precisar da API da próxima vez
                            bancoDeProdutos[codigo] = nomeDaApi;
                            salvarDados();
                            pedirPreco(codigo, nomeDaApi, quantidade);

                        } else {
                            // A API não achou o código. Chama a digitação manual!
                            pedirNomeManual(codigo, quantidade);
                        }
                    })
                    .catch(erro => {
                        // Se estivermos sem internet ou o servidor deles cair
                        document.getElementById('codigo-lido').innerText = codigo;
                        pedirNomeManual(codigo, quantidade);
                    });
            }
        }

        // --- FUNÇÕES AUXILIARES DE TELA ---
        function pedirPreco(codigo, nome, quantidade) {
            setTimeout(() => {
                let precoDigitado = prompt(`Encontramos na rede: ${nome}!\nPreço unitário:`);
                if (precoDigitado) {
                    let precoFormatado = precoDigitado.replace(',', '.');
                    if (!isNaN(precoFormatado) && precoFormatado.trim() !== "") {
                        adicionarAoCarrinho(codigo, nome, parseFloat(precoFormatado), quantidade);
                    }
                }
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
                        }
                    }
                }
            }, 300);
        }

        // --- FUNÇÕES DO CARRINHO ---
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
                        <button onclick="alterarItemNoCarrinho('${item.codigo}', 1)" style="width: 28px; height: 28px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">+</button>
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

        function onScanSuccess(decodedText) { processarCodigo(decodedText); }
        function onScanFailure(error) { }
        function buscarManual() {
            const codigoDigitado = document.getElementById('codigo-manual').value;
            if(codigoDigitado.trim() !== "") {
                processarCodigo(codigoDigitado);
                document.getElementById('codigo-manual').value = ""; 
            } else { alert("Digite o código de barras primeiro."); }
        }

        carregarDados();
        
        let html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 150} }, false);
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);

        // --- TENTATIVA DE TRADUCAO DO SCANNER ---
// O JavaScript vai tentar verificar a tela a cada 1 segundo e traduzir os botões assim que eles aparecerem
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

    // Traduz o link de "Scan an Image File" (Escanear arquivo de imagem)
    const linkArquivo = document.getElementById('html5-qrcode-anchor-scan-type-change');
    if (linkArquivo && linkArquivo.innerText.includes('Scan an Image File')) {
        linkArquivo.innerText = 'Escanear imagem da galeria';
    } else if (linkArquivo && linkArquivo.innerText.includes('Scan using camera directly')) {
        linkArquivo.innerText = 'Escanear usando a câmera';
    }
}, 1000);