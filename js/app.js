// ==============================================
// CONFIGURAÇÕES - SEU CONTRATO
// ==============================================
const CONTRACT_ADDRESS = "0x9cbA7EE455eED643555D12B65D28b82A3AdB3f10";
const CONTRACT_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function burn(uint256 amount) external",
    "function totalSupply() view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event TokensQueimados(address indexed queimador, uint256 quantidade)"
];

// ==============================================
// ESTADO GLOBAL
// ==============================================
let provider, signer, contract;
let userAddress = null;
const INITIAL_SUPPLY = 31416000;

// Elementos DOM
const connectBtn = document.getElementById('connectBtn');
const transferBtn = document.getElementById('transferBtn');
const burnBtn = document.getElementById('burnBtn');
const balanceEl = document.getElementById('balance');
const burnedEl = document.getElementById('burned');
const networkBadge = document.getElementById('networkBadge');

// ==============================================
// FUNÇÕES UTILITÁRIAS
// ==============================================
function truncateAddress(addr) {
    return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';
}

function formatAmount(amount, decimals = 18) {
    return ethers.utils.formatUnits(amount, decimals);
}

function parseAmount(amount, decimals = 18) {
    return ethers.utils.parseUnits(amount.toString(), decimals);
}

// ==============================================
// CONEXÃO COM A CARTEIRA
// ==============================================
async function connectWallet() {
    if (!window.ethereum) {
        alert('MetaMask não encontrada! Instale a extensão.');
        return;
    }

    try {
        connectBtn.disabled = true;
        connectBtn.textContent = 'Conectando...';

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Verificar rede Amoy
        const network = await provider.getNetwork();
        if (network.chainId !== 80002) {
            alert('Conecte-se à rede Polygon Amoy');
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x13882' }]
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x13882',
                            chainName: 'Polygon Amoy',
                            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                            rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                            blockExplorerUrls: ['https://amoy.polygonscan.com/']
                        }]
                    });
                }
            }
        }

        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        connectBtn.textContent = `Conectado: ${truncateAddress(userAddress)}`;
        networkBadge.textContent = 'Amoy ✓';
        
        transferBtn.disabled = false;
        transferBtn.textContent = 'Transferir';
        burnBtn.disabled = false;
        burnBtn.textContent = 'Queimar';

        await updateBalance();
        await loadTotalBurned();
        setupEventListeners();

    } catch (error) {
        console.error('Erro:', error);
        connectBtn.disabled = false;
        connectBtn.textContent = 'Conectar Carteira';
        alert('Erro ao conectar. Veja o console.');
    }
}

// ==============================================
// ATUALIZAR SALDO
// ==============================================
async function updateBalance() {
    if (!contract || !userAddress) return;
    try {
        const balance = await contract.balanceOf(userAddress);
        const decimals = await contract.decimals();
        const formatted = formatAmount(balance, decimals);
        balanceEl.textContent = `${parseFloat(formatted).toFixed(2)} BSPI`;
    } catch (error) {
        console.error('Erro ao buscar saldo:', error);
    }
}

// ==============================================
// CARREGAR TOTAL QUEIMADO
// ==============================================
async function loadTotalBurned() {
    if (!contract) return;
    try {
        const totalSupply = await contract.totalSupply();
        const decimals = await contract.decimals();
        const totalSupplyFormatted = parseFloat(formatAmount(totalSupply, decimals));
        const burned = INITIAL_SUPPLY - totalSupplyFormatted;
        burnedEl.textContent = burned.toLocaleString() + ' BSPI';
    } catch (error) {
        console.error('Erro ao calcular total queimado:', error);
    }
}

// ==============================================
// TRANSFERIR TOKENS
// ==============================================
async function transferTokens() {
    const to = document.getElementById('toAddress').value.trim();
    const amount = document.getElementById('amount').value;
    const feedback = document.getElementById('transferFeedback');

    if (!ethers.utils.isAddress(to)) {
        feedback.textContent = '❌ Endereço inválido';
        return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        feedback.textContent = '❌ Quantidade inválida';
        return;
    }

    try {
        transferBtn.disabled = true;
        transferBtn.textContent = 'Transferindo...';
        
        const decimals = await contract.decimals();
        const amountWei = parseAmount(amount, decimals);
        
        const tx = await contract.transfer(to, amountWei);
        feedback.textContent = '⏳ Transação enviada...';
        await tx.wait();
        
        feedback.textContent = '✅ Transferência concluída!';
        await updateBalance();
        
    } catch (error) {
        console.error(error);
        feedback.textContent = `❌ Erro: ${error.message?.slice(0, 50)}...`;
    } finally {
        transferBtn.disabled = false;
        transferBtn.textContent = 'Transferir';
    }
}

// ==============================================
// QUEIMAR TOKENS
// ==============================================
async function burnTokens() {
    const amount = document.getElementById('burnAmount').value;
    const feedback = document.getElementById('burnFeedback');

    if (!amount || parseFloat(amount) <= 0) {
        feedback.textContent = '❌ Quantidade inválida';
        return;
    }

    try {
        burnBtn.disabled = true;
        burnBtn.textContent = 'Queimando...';
        
        const decimals = await contract.decimals();
        const amountWei = parseAmount(amount, decimals);
        
        const balance = await contract.balanceOf(userAddress);
        if (balance.lt(amountWei)) {
            feedback.textContent = '❌ Saldo insuficiente';
            return;
        }
        
        const tx = await contract.burn(amountWei);
        feedback.textContent = '⏳ Transação enviada...';
        await tx.wait();
        
        feedback.textContent = '✅ Tokens queimados com sucesso!';
        await updateBalance();
        await loadTotalBurned();
        
    } catch (error) {
        console.error(error);
        feedback.textContent = `❌ Erro: ${error.message?.slice(0, 50)}...`;
    } finally {
        burnBtn.disabled = false;
        burnBtn.textContent = 'Queimar';
    }
}

// ==============================================
// IA ASSISTENTE
// ==============================================
const iaResponses = {
    'saldo': 'Seu saldo aparece no dashboard. Conecte a carteira para ver.',
    'queimar': 'Vá na aba "Queimar", digite a quantidade e confirme.',
    'escola': 'A Escola Sathya Sai promove valores humanos: Verdade, Retidão, Paz, Amor e Não Violência.',
    'preço': 'O preço simbólico do BSPI é R$ 3,14.',
    'contrato': `O endereço do contrato é ${CONTRACT_ADDRESS}`,
    'pool': 'Você pode criar liquidez no QuickSwap (par BSPI/MATIC).',
    'airdrop': 'Airdrops são distribuições gratuitas de tokens. Use a aba Transferir ou um arquivo CSV.'
};

function sendIA(question, target) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user';
    msgDiv.innerHTML = `<div class="message-content">${question}</div>`;
    target.appendChild(msgDiv);

    const lower = question.toLowerCase();
    let answer = 'Pergunte sobre: saldo, queimar, escola, preço, contrato, pool, airdrop.';
    
    for (let [key, value] of Object.entries(iaResponses)) {
        if (lower.includes(key)) {
            answer = value;
            break;
        }
    }

    const botDiv = document.createElement('div');
    botDiv.className = 'message bot';
    botDiv.innerHTML = `<div class="message-content">${answer}</div>`;
    target.appendChild(botDiv);
    target.scrollTop = target.scrollHeight;
}

// ==============================================
// RANKING MOCKADO
// ==============================================
function loadRanking() {
    const holders = [
        { address: '0xDE98c...c0A', balance: 125000 },
        { address: '0x123...456', balance: 98000 },
        { address: '0x789...ABC', balance: 75400 },
        { address: '0xDEF...123', balance: 62100 },
        { address: '0x456...789', balance: 54300 }
    ];
    
    const burners = [
        { address: '0xDE98c...c0A', burned: 15000 },
        { address: '0x789...ABC', burned: 12400 },
        { address: '0x123...456', burned: 9800 },
        { address: '0xDEF...123', burned: 7600 },
        { address: '0x456...789', burned: 5400 }
    ];

    const holderList = document.getElementById('holderList');
    const burnerList = document.getElementById('burnerList');

    holderList.innerHTML = '';
    burners.forEach((item, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${i+1}. ${item.address}</span> <span>${item.burned.toLocaleString()} BSPI</span>`;
        burnerList.appendChild(li);
    });

    holders.forEach((item, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${i+1}. ${item.address}</span> <span>${item.balance.toLocaleString()} BSPI</span>`;
        holderList.appendChild(li);
    });
}

// ==============================================
// EVENT LISTENERS
// ==============================================
connectBtn.addEventListener('click', connectWallet);
transferBtn.addEventListener('click', transferTokens);
burnBtn.addEventListener('click', burnTokens);

// Sistema de abas
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// IA listeners
document.getElementById('iaSend').addEventListener('click', () => {
    const input = document.getElementById('iaInput');
    if (!input.value.trim()) return;
    sendIA(input.value, document.getElementById('iaMessages'));
    input.value = '';
});

document.getElementById('chatSend').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    if (!input.value.trim()) return;
    sendIA(input.value, document.getElementById('chatMessages'));
    input.value = '';
});

document.getElementById('chatHeader').addEventListener('click', () => {
    const chat = document.getElementById('chat');
    chat.style.height = chat.style.height === 'auto' ? '300px' : 'auto';
});

// Enter nos inputs
document.getElementById('iaInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('iaSend').click();
});

document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('chatSend').click();
});

// ==============================================
// INICIALIZAÇÃO
// ==============================================
loadRanking();