Page({
  data: {
    connected: false,
    deviceId: '',
    serviceId: '0000FFE0-0000-1000-8000-00805F9B34FB',
    characteristicId: '0000FFE1-0000-1000-8000-00805F9B34FB',
    pressing: false,
    scanning: false,
    devices: []
  },

  onLoad() {
    // 页面加载
  },

  // 按钮点击事件
  handleTap(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ pressing: true });
    // 发送控制指令
    this.sendControlCommand(type);
    setTimeout(() => {
      this.setData({ pressing: false });
    }, 100);
  },

  // 按钮长按事件
  handleLongPress(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ pressing: true });
    // 发送控制指令
    this.sendControlCommand(type);
  },

  // 按钮释放事件
  handleTouchEnd() {
    this.setData({ pressing: false });
    // 发送停止指令
    this.sendControlCommand('release');
  },

  // 发送控制指令
  sendControlCommand(type) {
    if (!this.data.connected) return;
    const command = this.getCommandByType(type);
    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: command,
      success: (res) => {
        console.log('指令发送成功:', type);
      }
    });
  },

  // 根据类型获取指令
  getCommandByType(type) {
    const commands = {
      up: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x01, 0x00]),
      down: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x02, 0x00]),
      left: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x04, 0x00]),
      right: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x08, 0x00]),
      release: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x00, 0x00]),
      omniWalk: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x10, 0x00]),
      dance: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x20, 0x00]),
      frontBack: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x40, 0x00]),
      moonwalkL: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x80, 0x00]),
      upDown: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x01, 0x01]),
      pushUp: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x02, 0x01]),
      hello: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x04, 0x01]),
      waveHand: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x08, 0x01]),
      scared: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x10, 0x01]),
      hide: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x20, 0x01])
    };
    return commands[type] || commands.release;
  },

  connectDevice() {
    this.setData({ scanning: true, devices: [] });
    
    wx.openBluetoothAdapter({
      success: () => {
        wx.startBluetoothDevicesDiscovery({
          success: () => {
            // 监听发现新设备
            wx.onBluetoothDeviceFound((res) => {
              const devices = res.devices.filter(device => device.name);
              if (devices.length > 0) {
                this.setData({ 
                  devices: [...this.data.devices, ...devices]
                    .filter((v, i, a) => a.findIndex(t => t.deviceId === v.deviceId) === i)
                });
              }
            });
            
            // 5秒后停止扫描
            setTimeout(() => {
              wx.stopBluetoothDevicesDiscovery();
              this.setData({ scanning: false });
            }, 5000);
          },
          fail: (err) => {
            console.error('扫描失败', err);
            this.setData({ scanning: false });
          }
        });
      },
      fail: (err) => {
        console.error('蓝牙初始化失败', err);
        this.setData({ scanning: false });
      }
    });
  },
  
  // 选择设备
  selectDevice(e) {
    const { deviceId } = e.currentTarget.dataset;
    this.setData({ deviceId }, () => {
      this.createBLEConnection();
    });
  },
          fail: (err) => {
            console.error('扫描失败', err);
            this.setData({ scanning: false });
          }
        });
      },
      fail: (err) => {
        console.error('蓝牙初始化失败', err);
        this.setData({ scanning: false });
      }
    });
  },
  
  // 选择设备
  selectDevice(e) {
    const { deviceId } = e.currentTarget.dataset;
    this.setData({ deviceId }, () => {
      this.createBLEConnection();
    });
  },

  createBLEConnection() {
    wx.createBLEConnection({
      deviceId: this.data.deviceId,
      success: (res) => {
        this.setData({ connected: true });
        this.getBLEDeviceServices();
      }
    });
  },

  getBLEDeviceServices() {
    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success: (res) => {
        this.getBLEDeviceCharacteristics();
      }
    });
  },

  getBLEDeviceCharacteristics() {
    wx.getBLEDeviceCharacteristics({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      success: (res) => {
        console.log('蓝牙连接成功');
      }
    });
  },

  sendCommand(cmd) {
    if (!this.data.connected) return;
    const buffer = new ArrayBuffer(1);
    const dataView = new DataView(buffer);
    dataView.setUint8(0, cmd);
    
    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
    });
  },

  moveForward() {
    this.sendCommand(0x01); // 前进指令
  },

  moveBackward() {
    this.sendCommand(0x02); // 后退指令
  },

  turnLeft() {
    this.sendCommand(0x03); // 左转指令
  },

  turnRight() {
    this.sendCommand(0x04); // 右转指令
  },

  stop() {
    this.sendCommand(0x00); // 停止指令
  },

  omniWalk() {
    this.sendCommand(0x10); // 全向行走
  },

  dance() {
    this.sendCommand(0x11); // 跳舞
  },

  frontBack() {
    this.sendCommand(0x12); // 前后摆动
  },

  moonwalkL() {
    this.sendCommand(0x13); // 左太空步
  },

  upDown() {
    this.sendCommand(0x14); // 上下运动
  },

  pushUp() {
    this.sendCommand(0x15); // 俯卧撑
  },

  hello() {
    this.sendCommand(0x16); // 打招呼
  },

  waveHand() {
    this.sendCommand(0x17); // 挥手
  },

  scared() {
    this.sendCommand(0x18); // 害怕动作
  },

  hide() {
    this.sendCommand(0x19); // 躲藏动作
  }
})