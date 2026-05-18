'use strict';

// 1. Carregar els logs guardats quan s'obre la pàgina
document.addEventListener("DOMContentLoaded", () => {
    renderitzarAuditoria();
});
function netejarAuditoria() {
    if (!confirm("Confirmes que vols buidar el registre d'auditoria de la base de dades?")) return;
    localStorage.removeItem('auditoria_iot');
    renderitzarAuditoria();
}
//  Funció per registrar 
function registrarAuditoria(missatge) {
    const time = new Date().toLocaleTimeString();
    const logHTML = `<span class="mono" style="color: var(--industrial-blue); font-weight:bold;">[${time}]</span> ${missatge}`;
    
    // Llegim la base de dades local (o creem un array buit si no existeix)
    let historial = JSON.parse(localStorage.getItem('auditoria_iot')) || [];
    
    // Afegim el nou missatge a dalt de tot
    historial.unshift(logHTML);
    
    // Guardem un màxim de 50 registres per no saturar
    if (historial.length > 50) {
        historial.pop();
    }
    
    // Guardem a la memòria del navegador
    localStorage.setItem('auditoria_iot', JSON.stringify(historial));
    
    // Actualitzem la pantalla
    renderitzarAuditoria();
}

// funcio dibuixar llista a html
function renderitzarAuditoria() {
    const ul = document.getElementById('audit-list');
    if (!ul) return;
    
    let historial = JSON.parse(localStorage.getItem('auditoria_iot')) || [];
    
    if (historial.length === 0) {
        ul.innerHTML = '<li style="color: #94a3b8; text-align: center;">No hi ha registres recents</li>';
    } else {
        ul.innerHTML = historial.map(log => `<li>${log}</li>`).join('');
    }
}


/* 
   logica inteficie
*/
function login() {
    const user = document.getElementById('username').value || 'Usuari Desconegut';
    registrarAuditoria(`Inici de sessió: ${user}`);
    
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('app-view').classList.add('active');
}

function logout() {
    registrarAuditoria(`Sessió tancada`);
    document.getElementById('app-view').classList.remove('active');
    document.getElementById('login-view').classList.add('active');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById('tab-' + tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}


/*
   ALARMES I CONTROL MANUAL
 */
function enviarComandaAlarma(checkbox) {
    if (!confirm("ACCIÓ REQUERIDA:\nConfirmes que tens permisos per canviar l'estat d'aquesta variable al PLC?")) {
        checkbox.checked = !checkbox.checked; // Si cancel·la, revertim l'interruptor
        return;
    }

    const topic = 'fabrica/control/alarma';
    const payload = checkbox.checked ? '1' : '0';
    const estatText = checkbox.checked ? 'ON' : 'OFF';
    
    if (client && client.connected) {
        client.publish(topic, payload);
        registrarAuditoria(`Comanda enviada a l'actuador: Alarma -> ${estatText}`);
    } else {
        alert("Error: No s'ha pogut comunicar amb el PLC (Broker desconnectat).");
        checkbox.checked = !checkbox.checked; 
    }
}

function reconolixerAlarma(btn) {
    if(!confirm("Estàs segur que vols reconèixer (ACK) aquesta alarma i marcar-la com a atesa?")) return;
    
    // Canviem visualment estat de la fila
    const row = btn.closest('tr');
    const badge = row.querySelector('.badge');
    
    badge.className = 'badge badge-resolved';
    badge.innerText = 'Reconeguda';
    btn.remove(); // Amaguem el botó un cop atesa
    
    registrarAuditoria(`Alarma reconeguda per l'operari (Temperatura PLC)`);
}

/* 
   Fer QR
*/
function generarQR(textData, nomDispositiu) {
    document.getElementById('qr-title').innerText = `QR Identificador: ${nomDispositiu}`;
    const container = document.getElementById('qr-result');
    container.innerHTML = ''; // Netegem si hi ha un QR anterior
    
    // Cridem a la llibreria qrcode.js
    new QRCode(container, {
        text: textData,
        width: 140,
        height: 140,
        colorDark : "#1F4E79", 
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
    });
    
    registrarAuditoria(`Generat codi QR temporal per al dispositiu: ${nomDispositiu}`);
}

/*
   Lmqtt
 */
function crearGrafica(idCanvas, titulo, colorLinea, colorFondo) {
    const canvas = document.getElementById(idCanvas);
    if (!canvas) return null;
    
    return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: titulo,
                data: [],
                borderColor: colorLinea,
                backgroundColor: colorFondo,
                borderWidth: 2,
                pointRadius: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                x: { ticks: { color: '#64748b' } }, 
                y: { ticks: { color: '#64748b' } } 
            },
            plugins: { legend: { labels: { color: '#212121' } } }
        }
    });
}

// diccionari
const configuracionSensores = {
    temperatura_dht: { 
        grafica: crearGrafica('tempExtChart', 'Temp Ext (°C)', '#2E7D32', 'rgba(46, 125, 50, 0.15)'),
        idTexto: 'tempExt-display',
        unidad: ' °C'
    },
    humitat_dht: { 
        grafica: crearGrafica('humChart', 'Humitat (%)', '#2E74B5', 'rgba(46, 116, 181, 0.15)'),
        idTexto: 'hum-display',
        unidad: ' %'
    },
    temperatura: { 
        grafica: crearGrafica('tempPlcChart', 'Temp PLC (°C)', '#f97316', 'rgba(249, 115, 22, 0.15)'),
        idTexto: 'tempPlc-display',
        unidad: ' °C'
    },
    estat_maquina: { 
        grafica: crearGrafica('estatChart', 'Estat', '#a855f7', 'rgba(168, 85, 247, 0.15)'),
        idTexto: 'estat-display',
        unidad: '' 
    },
    peces_fabricades: { 
        grafica: crearGrafica('pecesChart', 'Peces', '#F9A825', 'rgba(249, 168, 37, 0.15)'),
        idTexto: 'peces-display',
        unidad: ' uds'
    }
};

// 2. CONNEXIÓ MQTT (Intacte)
const brokerUrl = 'ws://157.151.236.103:9001'; 
const client = mqtt.connect(brokerUrl, {
    username: 'admin_iot',
    password: 'SuperSeguro_2026_IoT!'
});

client.on('connect', () => {
    console.log('Connectat al broker MQTT');
    document.getElementById('mqtt-status-dot').className = 'dot connected';
    document.getElementById('mqtt-status-text').innerText = 'Connectat (Temps Real)';
    client.subscribe('fabrica/#'); 
});

// 3. procesament
client.on('message', (topic, message) => {
    try {
        const datosJSON = JSON.parse(message.toString());
        const hora = new Date().toLocaleTimeString();

        for (const clave in datosJSON) {
            if (configuracionSensores[clave]) {
                const sensor = configuracionSensores[clave];
                const valor = parseFloat(datosJSON[clave]);

                if (isNaN(valor)) continue; 

                // Formateig
                let textoMostrar = (clave === 'estat_maquina' || clave === 'peces_fabricades') 
                    ? valor.toFixed(0) 
                    : valor.toFixed(1);

                document.getElementById(sensor.idTexto).innerText = textoMostrar + sensor.unidad;
                
                sensor.grafica.data.labels.push(hora);
                sensor.grafica.data.datasets[0].data.push(valor);

                // Finestra de temps
                if (sensor.grafica.data.labels.length > 15) {
                    sensor.grafica.data.labels.shift();
                    sensor.grafica.data.datasets[0].data.shift();
                }
                
                sensor.grafica.update('none');
            }
        }
    } catch (error) {
        console.error("Missatge ignorat (no és un JSON):", message.toString());
    }
});

client.on('error', (err) => {
    console.error("¡ERROR MQTT!:", err);
    document.getElementById('mqtt-status-dot').className = 'dot error';
    document.getElementById('mqtt-status-text').innerText = 'Error de connexió';
});