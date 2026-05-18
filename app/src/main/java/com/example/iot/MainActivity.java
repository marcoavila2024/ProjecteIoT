package com.example.iot;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.ToggleButton;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;

import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private TextView txtTempExt, txtHum, txtTempPlc, txtEstat, txtPeces;
    private ToggleButton btnAlarma;
    private MqttClient client;

    // Conexión por puerto TCP estándar (1883), mucho más estable en Android nativo
    private final String BROKER_URL = "tcp://157.151.236.103:1883";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Enlazar los elementos de la pantalla
        txtTempExt = findViewById(R.id.txtTempExt);
        txtHum = findViewById(R.id.txtHum);
        txtTempPlc = findViewById(R.id.txtTempPlc);
        txtEstat = findViewById(R.id.txtEstat);
        txtPeces = findViewById(R.id.txtPeces);
        btnAlarma = findViewById(R.id.btnAlarma);

        // Iniciar servicios
        crearCanalNotificaciones();
        conectarMQTT();

        // Acción del botón de control manual
        btnAlarma.setOnClickListener(v -> enviarComandaAlarma(btnAlarma.isChecked()));
    }

    private void conectarMQTT() {
        try {
            client = new MqttClient(BROKER_URL, "AndroidSupervisorApp", new MemoryPersistence());
            MqttConnectOptions options = new MqttConnectOptions();
            options.setUserName("admin_iot");
            options.setPassword("SuperSeguro_2026_IoT!".toCharArray());

            client.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    runOnUiThread(() -> setTitle("Desconectado - Reintentando..."));
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    // Procesar los datos en el hilo principal de la interfaz
                    runOnUiThread(() -> procesarDatosJSON(new String(message.getPayload())));
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {}
            });

            client.connect(options);
            client.subscribe("fabrica/#");
            setTitle("IoT - Conectado");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void procesarDatosJSON(String jsonString) {
        try {
            JSONObject datos = new JSONObject(jsonString);

            // Mapeo exacto de tus variables de Node-RED
            if (datos.has("temperatura_dht")) {
                txtTempExt.setText(datos.getString("temperatura_dht") + " °C");
            }
            if (datos.has("humitat_dht")) {
                txtHum.setText(datos.getString("humitat_dht") + " %");
            }
            if (datos.has("temperatura")) {
                txtTempPlc.setText(datos.getString("temperatura") + " °C");
            }
            if (datos.has("peces_fabricades")) {
                txtPeces.setText(datos.getString("peces_fabricades") + " uds");
            }
            if (datos.has("estat_maquina")) {
                int estat = datos.getInt("estat_maquina");
                txtEstat.setText(String.valueOf(estat));

                // Si el PLC se avería (Estat 2), lanzamos la notificación Push nativa
                if (estat == 2) {
                    lanzarNotificacionAlerta();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void enviarComandaAlarma(boolean activar) {
        try {
            if (client != null && client.isConnected()) {
                String payload = activar ? "1" : "0";
                client.publish("fabrica/control/alarma", new MqttMessage(payload.getBytes()));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void lanzarNotificacionAlerta() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "ALERTAS_FABB")
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("⚠️ ALARMA CRÍTICA PLC")
                .setContentText("La línia 1 ha entrat en estat d'avaria (Estat 2).")
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        NotificationManager msgManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (msgManager != null) {
            msgManager.notify(1, builder.build());
        }
    }

    private void crearCanalNotificaciones() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "ALERTAS_FABB", "Alertas Planta", NotificationManager.IMPORTANCE_HIGH);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}