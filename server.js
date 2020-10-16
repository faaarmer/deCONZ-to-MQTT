"use strict";

const WebSocket = require("ws");
const mqtt = require("mqtt");
const config = require("./config.json");
const socket = new WebSocket(
  `ws://${config.deconz.host}:${config.deconz.port}`
);

var mqttConnected = false;

const client = mqtt.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`, {
  keepalive: 10000,
  clientId: "deconz-to-mqtt",
  username: config.mqtt.username,
  password: config.mqtt.password,
});

client.on("error", () => {
  console.log("MQTT connection failure or parsing error");
  mqttConnected = false;
});

client.on("offline", () => {
  console.log("MQTT going offline");
  mqttConnected = false;
});

client.on("connect", () => {
  console.log("Connected to MQTT Server!!");
  mqttConnected = true;
});

client.on("end", () => {
  console.log("MQTT shutdown");
  mqttConnected = false;
});

client.on("message", (topic, message) => {
  console.log("onMessageArrived:" + message.payloadString);
});

socket.on("open", () => {
  console.log("Connected to Phoscon!");
  socket.on("message", (data) => {
    const sensorData = JSON.parse(data);
    if (parseInt(sensorData.id, 10) > 4) {
      console.log("sensorData", sensorData);
    }
    const sensorId = sensorData.id;
    const sensor = config.sensors[sensorId];
    if (sensor === undefined) {
      // console.log(`sensor not defined: ${sensorId}`);
      return;
    }

    const topic = `${sensor.topic}`;
    const dataType = `${sensor.data}`;
    if (!sensorData.state || !sensorData.state[dataType]) {
      console.log("got sensor info without state, 🤔");
      return;
    }
    const value = sensorData.state[dataType] / sensor.divisor;

    if (mqttConnected) {
      client.publish(topic, `${value}`);
      console.log(`topic: ${topic} data: ${value} published`);
    } else {
      console.log(`topic: ${topic} data: ${value} not published - `);
      console.log("mqtt not connected.");
    }
  });
});

socket.on("error", () => {
  console.log("something has gone wrong");
});

console.log("started");
