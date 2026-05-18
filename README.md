# Projecte IoT

Aquest repositori conté el codi font del frontend web i la configuració de la infraestructura de backend per al sistema de monitoratge en temps real d'un procés productiu industrial controlat per un PLC.

## Arquitectura del Sistema

El sistema es basa en una arquitectura híbrida distribuïda que garanteix alta disponibilitat, traçabilitat i actualització de dades en temps real:

* Backend: Allotjat en una instància d'Oracle Cloud Infrastructure (OCI), executat en entorns contenidoritzats mitjançant Docker. La seguretat d'accés a la infraestructura es gestiona de forma estricta mitjançant claus privades SSH.
* Frontend: Aplicació web allotjada com a servei gestionat a AWS Amplify per garantir un accés global, ràpid i escalable.

## Components de la Infraestructura (Backend)

L'stack de serveis està dissenyat per rebre, processar i persistir les dades generades de forma contínua:

* Broker MQTT (Eclipse Mosquitto): S'encarrega de la recepció de missatges de la planta i la seva distribució cap dels clients connectats.
* Base de dades temporal (InfluxDB): Optimizada per a l'emmagatzematge de sèries temporals de les variables del PLC i sensors ambientals.
* Motor de persistència i lògica: Node-RED actua com a node central per gestionar el flux de dades de forma reactiva.

## Característiques del Front End Web

La interfície d'usuari és una aplicació web lleugera desenvolupada amb HTML5, CSS3 i JavaScript pur (Vanilla JS), estructurada sota els següents mòduls:

* Comunicació en temps real: Connexió bidireccional amb el broker Mosquitto mitjançant MQTT over WebSockets a través del port 9001, utilitzant la llibreria MQTT.js per a la subscripció al topic fabrica/#.
* Visualització de dades avançada: Gràfiques dinàmiques basades en una llibreria especialitzada de JavaScript que permeten als operaris analitzar l'històric a curt termini de temperatures, humitat i ritme de producció.
* Registre d'auditoria: Un historial interactiu integrat que captura i mostra cronològicament esdeveniments crítics, com pèrdues de connexió, actuacions remotes de l'usuari o canvis a estat d'avaria (Estat 2).
* Accés ràpid per codi QR: Mòdul de generació de codis QR a la pròpia pantalla per permetre als operaris de planta escanejar i obrir el dashboard de forma immediata en dispositius mòbils.

## Requisits per al Desplegament

Per replicar l'entorn de backend, és necessari disposar de Docker i Docker Compose a la màquina servidora, assegurant l'obertura dels ports 1883 (MQTT TCP) i 9001 (MQTT WebSockets) a les regles de xarxa d'Oracle Cloud.
