function crearGrafica(idCanvas, titulo, colorLinea, colorFondo) {
    const ctx = document.getElementById(idCanvas).getContext('2d');
    return new Chart(ctx, {
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

// configuracio sensores
const configuracionSensores = {
    //temperatura
    'fabrica/sensores': {
        grafica: crearGrafica('tempChart', 'Temp (°C)', '#ff5733', 'rgba(255, 87, 51, 0.2)'),
        idTexto: 'temp-display',
        unidad: ' °C'
    },
    // humitat
    'fabrica/sensores': {
        grafica: crearGrafica('humChart', 'Humedad (%)', '#33b5ff', 'rgba(51, 181, 255, 0.2)'),
        idTexto: 'hum-display',
        unidad: ' %'
    },
    // vibracio 
    'fabrica/sensores': {
        grafica: crearGrafica('vibChart', 'Vibración (Hz)', '#cc33ff', 'rgba(66, 15, 83, 0.2)'),
        idTexto: 'vib-display',
        unidad: ' Hz'
    }
};

// conexio amb el mqtt
const brokerUrl = 'ws://157.151.236.103:9001'; 
const client = mqtt.connect(brokerUrl, {
    username: 'admin_iot',
    password: 'SuperSeguro_2026_IoT!'
});

client.on('connect', () => {
    console.log('Conectado al broker');

    const topics = Object.keys(configuracionSensores);
    client.subscribe(topics);
    console.log('Suscrito a:', topics);
});

// representacion de dades
client.on('message', (topic, message) => {
    if (configuracionSensores[topic]) {
        const sensor = configuracionSensores[topic];
        const valor = parseFloat(message.toString());
        const hora = new Date().toLocaleTimeString();
        document.getElementById(sensor.idTexto).innerText = valor + sensor.unidad;
        sensor.grafica.data.labels.push(hora);
        sensor.grafica.data.datasets[0].data.push(valor);

        // Mantener solo los últimos 15 datos
        if (sensor.grafica.data.labels.length > 15) {
            sensor.grafica.data.labels.shift();
            sensor.grafica.data.datasets[0].data.shift();
        }

        sensor.grafica.update();
    }
});
// missatge en cas de no tindre connexio amb el mqtt
client.on('error', (err) => {
    console.error("¡ERROR MQTT!:", err);
});
client.on('close', () => {
    console.warn("Conexión cerrada por el broker (Desconectado)");
});