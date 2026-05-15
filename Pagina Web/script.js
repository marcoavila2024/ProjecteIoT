'use strict';

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
            scales: { x: { ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa' } } },
            plugins: { legend: { labels: { color: 'white' } } }
        }
    });
}

const configuracionSensores = {
    // Claves del nodo  (Clima / Exterior)
    temperatura_dht: { 
        grafica: crearGrafica('tempExtChart', 'Temp Ext (°C)', '#22c55e', 'rgba(34, 197, 94, 0.2)'),
        idTexto: 'tempExt-display',
        unidad: ' °C'
    },
    humitat_dht: { 
        grafica: crearGrafica('humChart', 'Humedad (%)', '#33b5ff', 'rgba(51, 181, 255, 0.2)'),
        idTexto: 'hum-display',
        unidad: ' %'
    },
    
    // Clave del nodo DS18B20 (Temperatura PLC)
    temperatura: { 
        grafica: crearGrafica('tempPlcChart', 'Temp PLC (°C)', '#ff5733', 'rgba(255, 87, 51, 0.2)'),
        idTexto: 'tempPlc-display',
        unidad: ' °C'
    },

    // Claves del nodo PLC FINS (Producción)
    estat_maquina: { 
        grafica: crearGrafica('estatChart', 'Estado', '#a855f7', 'rgba(168, 85, 247, 0.2)'),
        idTexto: 'estat-display',
        unidad: '' 
    },
    peces_fabricades: { 
        grafica: crearGrafica('pecesChart', 'Piezas', '#f97316', 'rgba(249, 115, 22, 0.2)'),
        idTexto: 'peces-display',
        unidad: ' uds'
    }
};

// 2. CONEXIÓN MQTT
const brokerUrl = 'ws://157.151.236.103:9001'; 
const client = mqtt.connect(brokerUrl, {
    username: 'admin_iot',
    password: 'SuperSeguro_2026_IoT!'
});

client.on('connect', () => {
    console.log('Conectado al broker MQTT');
    client.subscribe('fabrica/#'); // Escuchamos todo
});

// 3. PROCESAMIENTO
client.on('message', (topic, message) => {
    try {
        const datosJSON = JSON.parse(message.toString());
        const hora = new Date().toLocaleTimeString();

        // Repasamos json
        for (const clave in datosJSON) {
            
            if (configuracionSensores[clave]) {
                const sensor = configuracionSensores[clave];
                const valor = parseFloat(datosJSON[clave]);

                if (isNaN(valor)) continue; // Si por algún motivo no es un número, lo ignoramos

                let textoMostrar = (clave === 'estat_maquina' || clave === 'peces_fabricades') 
                    ? valor.toFixed(0) 
                    : valor.toFixed(1);

                document.getElementById(sensor.idTexto).innerText = textoMostrar + sensor.unidad;
                
                // Actualizamos la gráfica
                sensor.grafica.data.labels.push(hora);
                sensor.grafica.data.datasets[0].data.push(valor);

                // Mantenemos solo los últimos 15 datos
                if (sensor.grafica.data.labels.length > 15) {
                    sensor.grafica.data.labels.shift();
                    sensor.grafica.data.datasets[0].data.shift();
                }
                
                sensor.grafica.update('none');
            }
        }
    } catch (error) {
        console.error("Mensaje ignorado (no es un JSON válido):", message.toString());
    }
});

client.on('error', (err) => console.error("¡ERROR MQTT!:", err));