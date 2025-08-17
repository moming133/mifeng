// pages/devices/devices.js
const app = getApp();

// 蓝牙服务UUID
const BLE_SERVICE_UUID = '6E400006-B5A3-F393-E0A9-E50E24DCCA9E';
// 蓝牙特征值UUID
const BLE_CHARACTERISTIC_UUID = '6E400008-B5A3-F393-E0A9-E50E24DCCA9E';

Page({
    data: {
        // 蓝牙相关状态
        bluetoothAdapterState: false,
        discovering: false,
        connectedDeviceId: null,
        bleDevices: [],
        currentDevice: null,
        
        devices: [
            {
                id: 'light_001',
                name: '客厅主灯',
                type: 'light',
                status: 'on',
                brightness: 80,
                color: '#ffeb3b',
                icon: '💡',
                location: '客厅',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'ac_001',
                name: '客厅空调',
                type: 'air_conditioner',
                status: 'off',
                temperature: 26,
                mode: 'auto',
                icon: '❄️',
                location: '客厅',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'speaker_001',
                name: '智能音箱',
                type: 'speaker',
                status: 'on',
                volume: 50,
                icon: '🔊',
                location: '客厅',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'camera_001',
                name: '门口摄像头',
                type: 'camera',
                status: 'on',
                recording: true,
                icon: '📹',
                location: '门口',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'sensor_001',
                name: '温湿度传感器',
                type: 'sensor',
                status: 'online',
                temperature: 24,
                humidity: 65,
                icon: '🌡️',
                location: '客厅',
                lastUpdated: new Date().toISOString()
            }
        ],
        deviceCategories: [
            { id: 'all', name: '全部设备' },
            { id: 'light', name: '照明' },
            { id: 'air_conditioner', name: '空调' },
            { id: 'speaker', name: '音响' },
            { id: 'camera', name: '摄像头' },
            { id: 'sensor', name: '传感器' }
        ],
        currentCategory: 'all',
        searchQuery: '',
        filteredDevices: [],
        loading: false,
        connectingDevice: null,
        roomDevices: {}
    },

    onLoad: function () {
        this.setData({
            filteredDevices: this.data.devices
        });
        this.groupDevicesByRoom();
    },

    onShow: function () {
        this.loadDevices();
        this.checkDeviceConnections();
    },

    // 加载设备列表
    loadDevices: function () {
        // 这里可以从服务器或本地存储加载设备列表
        const savedDevices = wx.getStorageSync('devices');
        if (savedDevices && savedDevices.length > 0) {
            this.setData({
                devices: savedDevices
            });
            this.filterDevices();
            this.groupDevicesByRoom();
        }
    },

    // 检查设备连接状态
    checkDeviceConnections: function () {
        // 模拟检查设备连接状态
        const devices = this.data.devices.map(device => ({
            ...device,
            status: Math.random() > 0.1 ? 'online' : 'offline'
        }));

        this.setData({ devices });
        this.filterDevices();
    },

    // 按房间分组设备
    groupDevicesByRoom: function () {
        const roomDevices = {};
        this.data.devices.forEach(device => {
            const room = device.location || '未分类';
            if (!roomDevices[room]) {
                roomDevices[room] = [];
            }
            roomDevices[room].push(device);
        });

        this.setData({ roomDevices });
    },

    // 切换设备分类
    switchCategory: function (e) {
        const category = e.currentTarget.dataset.category;
        this.setData({
            currentCategory: category,
            searchQuery: ''
        });
        this.filterDevices();
    },

    // 搜索设备
    onSearch: function (e) {
        const query = e.detail.value.toLowerCase();
        this.setData({
            searchQuery: query
        });
        this.filterDevices();
    },

    // 过滤设备
    filterDevices: function () {
        let filtered = this.data.devices;

        // 按分类过滤
        if (this.data.currentCategory !== 'all') {
            filtered = filtered.filter(device => device.type === this.data.currentCategory);
        }

        // 按搜索词过滤
        if (this.data.searchQuery) {
            filtered = filtered.filter(device =>
                device.name.toLowerCase().includes(this.data.searchQuery) ||
                (device.location && device.location.toLowerCase().includes(this.data.searchQuery))
            );
        }

        this.setData({
            filteredDevices: filtered
        });
    },

    // 切换设备状态
    toggleDevice: function (e) {
        const { deviceId } = e.currentTarget.dataset;
        const devices = this.data.devices.map(device => {
            if (device.id === deviceId) {
                const newStatus = device.status === 'on' ? 'off' : 'on';
                // 保存到本地存储
                wx.setStorageSync('devices', this.data.devices);
                return { ...device, status: newStatus };
            }
            return device;
        });

        this.setData({ devices });
        this.filterDevices();
        this.groupDevicesByRoom();

        // 发送设备控制命令到服务器
        this.sendDeviceCommand(deviceId, 'toggle');
    },

    // 调节设备亮度
    adjustBrightness: function (e) {
        const { deviceId, value } = e.detail;
        const devices = this.data.devices.map(device => {
            if (device.id === deviceId && device.type === 'light') {
                wx.setStorageSync('devices', this.data.devices);
                return { ...device, brightness: value };
            }
            return device;
        });

        this.setData({ devices });
        this.filterDevices();
        this.groupDevicesByRoom();

        // 发送设备控制命令到服务器
        this.sendDeviceCommand(deviceId, 'brightness', value);
    },

    // 调节音量
    adjustVolume: function (e) {
        const { deviceId, value } = e.detail;
        const devices = this.data.devices.map(device => {
            if (device.id === deviceId && device.type === 'speaker') {
                wx.setStorageSync('devices', this.data.devices);
                return { ...device, volume: value };
            }
            return device;
        });

        this.setData({ devices });
        this.filterDevices();
        this.groupDevicesByRoom();

        // 发送设备控制命令到服务器
        this.sendDeviceCommand(deviceId, 'volume', value);
    },

    // 设置空调温度
    setTemperature: function (e) {
        const { deviceId, value } = e.detail;
        const devices = this.data.devices.map(device => {
            if (device.id === deviceId && device.type === 'air_conditioner') {
                wx.setStorageSync('devices', this.data.devices);
                return { ...device, temperature: value };
            }
            return device;
        });

        this.setData({ devices });
        this.filterDevices();
        this.groupDevicesByRoom();

        // 发送设备控制命令到服务器
        this.sendDeviceCommand(deviceId, 'temperature', value);
    },

    // 发送设备控制命令
    sendDeviceCommand: function (deviceId, command, value) {
        console.log(`发送设备命令: ${deviceId}, ${command}, ${value}`);

        // 这里应该通过WebSocket发送命令到服务器
        if (app.globalData.isConnected && app.globalData.socket) {
            const message = {
                type: 'iot',
                commands: [{
                    device_id: deviceId,
                    action: command,
                    value: value
                }]
            };

            app.globalData.socket.send({
                data: JSON.stringify(message)
            });
        }
    },

    // 连接设备
    connectDevice: function (e) {
        const { deviceId } = e.currentTarget.dataset;
        this.setData({
            connectingDevice: deviceId
        });

        // 模拟连接过程
        setTimeout(() => {
            this.setData({
                connectingDevice: null
            });

            wx.showToast({
                title: '连接成功',
                icon: 'success'
            });
        }, 2000);
    },

    // 断开设备连接
    disconnectDevice: function (e) {
        const { deviceId } = e.currentTarget.dataset;

        wx.showModal({
            title: '确认断开',
            content: '确定要断开此设备的连接吗？',
            success: (res) => {
                if (res.confirm) {
                    const devices = this.data.devices.map(device => {
                        if (device.id === deviceId) {
                            return { ...device, status: 'offline' };
                        }
                        return device;
                    });

                    this.setData({ devices });
                    this.filterDevices();
                    this.groupDevicesByRoom();

                    wx.showToast({
                        title: '已断开连接',
                        icon: 'success'
                    });
                }
            }
        });
    },

    // 添加设备
    addDevice: function () {
        wx.showModal({
            title: '添加设备',
            content: '请确保设备处于配对模式，然后点击确定',
            confirmText: '开始配对',
            success: (res) => {
                if (res.confirm) {
                    this.initBluetooth();
                }
            }
        });
    },

    // 初始化蓝牙模块
    initBluetooth: function() {
        wx.openBluetoothAdapter({
            success: (res) => {
                console.log('蓝牙初始化成功', res);
                this.setData({ bluetoothAdapterState: true });
                this.startBluetoothDiscovery();
            },
            fail: (err) => {
                console.error('蓝牙初始化失败', err);
                wx.showToast({
                    title: '请开启手机蓝牙',
                    icon: 'none'
                });
            }
        });
    },

    // 开始蓝牙设备发现
    startBluetoothDiscovery: function() {
        this.setData({
            loading: true,
            discovering: true,
            bleDevices: []
        });

        wx.startBluetoothDevicesDiscovery({
            allowDuplicatesKey: false,
            success: (res) => {
                console.log('开始搜索设备', res);
                
                // 监听发现新设备事件
                wx.onBluetoothDeviceFound((devices) => {
                    const newDevices = devices.devices
                        .filter(device => device.name && !this.data.bleDevices.some(d => d.deviceId === device.deviceId))
                        .map(device => ({
                            deviceId: device.deviceId,
                            name: device.name,
                            RSSI: device.RSSI,
                            advertisData: device.advertisData
                        }));
                    
                    if (newDevices.length > 0) {
                        this.setData({
                            bleDevices: [...this.data.bleDevices, ...newDevices]
                        });
                    }
                });
            },
            fail: (err) => {
                console.error('搜索设备失败', err);
                this.setData({ loading: false });
                wx.showToast({
                    title: '搜索设备失败',
                    icon: 'none'
                });
            }
        });

        // 10秒后自动停止搜索
        setTimeout(() => {
            this.stopBluetoothDiscovery();
        }, 10000);
    },

    // 停止蓝牙设备发现
    stopBluetoothDiscovery: function() {
        if (this.data.discovering) {
            wx.stopBluetoothDevicesDiscovery({
                success: (res) => {
                    console.log('停止搜索设备', res);
                    this.setData({
                        discovering: false,
                        loading: false
                    });
                }
            });
        }
    },

    // 连接蓝牙设备
    connectDevice: function(e) {
        const deviceId = e.currentTarget.dataset.deviceId;
        const device = this.data.bleDevices.find(d => d.deviceId === deviceId);
        
        if (!device) return;

        this.setData({
            connectingDevice: deviceId,
            currentDevice: device
        });

        wx.createBLEConnection({
            deviceId: deviceId,
            success: (res) => {
                console.log('连接成功', res);
                this.setData({
                    connectedDeviceId: deviceId,
                    connectingDevice: null
                });
                this.getBLEDeviceServices(deviceId);
            },
            fail: (err) => {
                console.error('连接失败', err);
                this.setData({ connectingDevice: null });
                wx.showToast({
                    title: '连接失败',
                    icon: 'none'
                });
            }
        });
    },

    // 获取蓝牙设备服务
    getBLEDeviceServices: function(deviceId) {
        wx.getBLEDeviceServices({
            deviceId: deviceId,
            success: (res) => {
                console.log('获取服务成功', res.services);
                const service = res.services.find(s => s.uuid === BLE_SERVICE_UUID);
                if (service) {
                    this.getBLEDeviceCharacteristics(deviceId, service.uuid);
                }
            },
            fail: (err) => {
                console.error('获取服务失败', err);
            }
        });
    },

    // 获取蓝牙特征值
    getBLEDeviceCharacteristics: function(deviceId, serviceId) {
        wx.getBLEDeviceCharacteristics({
            deviceId: deviceId,
            serviceId: serviceId,
            success: (res) => {
                console.log('获取特征值成功', res.characteristics);
                const characteristic = res.characteristics.find(c => c.uuid === BLE_CHARACTERISTIC_UUID);
                if (characteristic) {
                    this.listenBLECharacteristicValueChange(deviceId, serviceId, characteristic.uuid);
                }
            },
            fail: (err) => {
                console.error('获取特征值失败', err);
            }
        });
    },

    // 监听特征值变化
    listenBLECharacteristicValueChange: function(deviceId, serviceId, characteristicId) {
        wx.notifyBLECharacteristicValueChange({
            deviceId: deviceId,
            serviceId: serviceId,
            characteristicId: characteristicId,
            state: true,
            success: (res) => {
                console.log('监听特征值变化成功', res);
                wx.onBLECharacteristicValueChange((res) => {
                    console.log('收到设备数据:', res.value);
                    this.handleDeviceData(res.value);
                });
            }
        });
    },

    // 处理设备数据
    handleDeviceData: function(value) {
        // 解析设备数据并更新UI
        // 这里需要根据实际设备协议实现
        console.log('设备数据:', value);
    },

    // 发送控制命令
    sendDeviceCommand: function(deviceId, command, value) {
        if (!this.data.connectedDeviceId) {
            console.error('未连接设备');
            return;
        }

        let buffer = new ArrayBuffer(8);
        let dataView = new DataView(buffer);
        
        // 根据命令类型设置数据
        switch(command) {
            case 'toggle':
                dataView.setUint8(0, 0x01); // 开关命令
                break;
            case 'brightness':
                dataView.setUint8(0, 0x02); // 亮度命令
                dataView.setUint8(1, value);
                break;
            case 'volume':
                dataView.setUint8(0, 0x03); // 音量命令
                dataView.setUint8(1, value);
                break;
            case 'temperature':
                dataView.setUint8(0, 0x04); // 温度命令
                dataView.setUint8(1, value);
                break;
        }

        wx.writeBLECharacteristicValue({
            deviceId: this.data.connectedDeviceId,
            serviceId: BLE_SERVICE_UUID,
            characteristicId: BLE_CHARACTERISTIC_UUID,
            value: buffer,
            success: (res) => {
                console.log('写入成功', res);
            },
            fail: (err) => {
                console.error('写入失败', err);
            }
        });
    },

    // 删除设备
    deleteDevice: function (e) {
        const { deviceId } = e.currentTarget.dataset;

        wx.showModal({
            title: '确认删除',
            content: '确定要删除此设备吗？删除后无法恢复。',
            success: (res) => {
                if (res.confirm) {
                    const devices = this.data.devices.filter(device => device.id !== deviceId);
                    this.setData({ devices });
                    this.filterDevices();
                    this.groupDevicesByRoom();

                    wx.setStorageSync('devices', devices);
                    wx.showToast({
                        title: '已删除',
                        icon: 'success'
                    });
                }
            }
        });
    },

    // 获取设备状态文本
    getDeviceStatusText: function (status) {
        const statusMap = {
            'online': '在线',
            'offline': '离线',
            'on': '开启',
            'off': '关闭',
            'connecting': '连接中',
            'connected': '已连接'
        };
        return statusMap[status] || status;
    },

    // 获取设备状态颜色
    getDeviceStatusColor: function (status) {
        const colorMap = {
            'online': '#07c160',
            'offline': '#999999',
            'on': '#07c160',
            'off': '#999999',
            'connecting': '#ff9500',
            'connected': '#1890ff'
        };
        return colorMap[status] || '#999999';
    },

    // 页面卸载时关闭蓝牙连接
    onUnload: function() {
        if (this.data.connectedDeviceId) {
            wx.closeBLEConnection({
                deviceId: this.data.connectedDeviceId
            });
        }
        
        if (this.data.bluetoothAdapterState) {
            wx.closeBluetoothAdapter();
        }
    }
});