const CONTRACT_ADDRESS = "0x9cbA7EE455eED643555D12B65D28b82A3AdB3f10";
const CONTRACT_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function burn(uint256 amount) external",
    "function totalSupply() view returns (uint256)"
];

let provider, signer, contract;
let userAddress;

async function connect() {
    if (!window.ethereum) return alert("MetaMask não encontrada");
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    document.getElementById("connectBtn").innerText = `Conectado: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
    updateBalance();
}

async function updateBalance() {
    if (!contract || !userAddress) return;
    const balance = await contract.balanceOf(userAddress);
    const formatted = ethers.utils.formatUnits(balance, 18);
    document.getElementById("balance").innerText = `${parseFloat(formatted).toFixed(2)} BSPI`;
}

document.getElementById("connectBtn").addEventListener("click", connect);

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
    });
});

// IA simples
const iaResponses = {
    "saldo": "Seu saldo aparece no dashboard. Conecte a carteira para ver.",
    "queimar": "Vá na aba Queimar, digite a quantidade e confirme.",
    "escola": "A Escola Sathya Sai promove valores humanos: Verdade, Retidão, Paz, Amor e Não Violência.",
    "preço": "O preço simbólico do BSPI é R$ 3,14.",
    "contrato": `O endereço do contrato é ${CONTRACT_ADDRESS}`,
};

function sendIA(question, target) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message user";
    msgDiv.innerHTML = `<div class="message-content">${question}</div>`;
    target.appendChild(msgDiv);

    const lower = question.toLowerCase();
    let answer = "Ainda não sei responder. Tente: saldo, queimar, escola, preço, contrato.";
    for (let [key, value] of Object.entries(iaResponses)) {
        if (lower.includes(key)) { answer = value; break; }
    }

    const botDiv = document.createElement("div");
    botDiv.className = "message bot";
    botDiv.innerHTML = `<div class="message-content">${answer}</div>`;
    target.appendChild(botDiv);
    target.scrollTop = target.scrollHeight;
}

document.getElementById("iaSend").addEventListener("click", () => {
    const input = document.getElementById("iaInput");
    if (!input.value.trim()) return;
    sendIA(input.value, document.getElementById("iaMessages"));
    input.value = "";
});

document.getElementById("chatSend").addEventListener("click", () => {
    const input = document.getElementById("chatInput");
    if (!input.value.trim()) return;
    sendIA(input.value, document.getElementById("chatMessages"));
    input.value = "";
});

document.getElementById("chatHeader").addEventListener("click", () => {
    const chat = document.getElementById("chat");
    chat.style.height = chat.style.height === "auto" ? "300px" : "auto";
});

// Ranking mock
const holders = ["0xDE98c...c0A", "0x123...456", "0x789...ABC"];
const list = document.getElementById("holderList");
holders.forEach((h, i) => {
    const li = document.createElement("li");
    li.innerText = `${i+1}. ${h} - ${1000 - i*200} BSPI`;
    list.appendChild(li);
});