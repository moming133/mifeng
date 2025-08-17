在微信小程序中实现全局蓝牙连接需要遵循一系列步骤，包括初始化蓝牙模块、搜索设备、建立连接以及数据交互。以下是具体实现步骤：

1. 初始化蓝牙模块

在使用蓝牙功能前，需调用 wx.openBluetoothAdapter 初始化蓝牙模块：

wx.openBluetoothAdapter({
success: (res) => {
console.log('蓝牙初始化成功', res);
},
fail: (err) => {
console.error('蓝牙初始化失败', err);
wx.showToast({ title: '请开启手机蓝牙', icon: 'none' });
}
});
注意：必须在初始化成功后才能调用其他蓝牙相关 API。

2. 搜索附近的蓝牙设备

通过 wx.startBluetoothDevicesDiscovery 开始搜索设备，并监听发现的设备：

wx.startBluetoothDevicesDiscovery({
allowDuplicatesKey: false,
success: (res) => {
console.log('开始搜索设备', res);
wx.onBluetoothDeviceFound((devices) => {
devices.devices.forEach(device => {
console.log('发现设备:', device);
});
});
}
});
提示：搜索完成后，建议调用 wx.stopBluetoothDevicesDiscovery 停止搜索以节省资源。

3. 建立蓝牙连接

使用 wx.createBLEConnection 与目标设备建立连接：

wx.createBLEConnection({
deviceId: '<目标设备ID>',
success: (res) => {
console.log('连接成功', res);
},
fail: (err) => {
console.error('连接失败', err);
}
});
建议：监听 wx.onBLEConnectionStateChange，以便处理断开连接的情况。

4. 获取服务和特征值

连接成功后，通过 wx.getBLEDeviceServices 和 wx.getBLEDeviceCharacteristics 获取服务和特征值：

wx.getBLEDeviceServices({
deviceId: '<目标设备ID>',
success: (res) => {
console.log('获取服务成功', res.services);
// 根据服务 UUID 获取特征值
wx.getBLEDeviceCharacteristics({
deviceId: '<目标设备ID>',
serviceId: '<服务UUID>',
success: (res) => {
console.log('获取特征值成功', res.characteristics);
}
});
}
});
5. 数据交互

通过 wx.writeBLECharacteristicValue 写入数据，并监听返回值：

let buffer = new ArrayBuffer(16); // 示例数据
let dataView = new DataView(buffer);
dataView.setUint8(0, 0x01); // 设置数据

wx.writeBLECharacteristicValue({
deviceId: '<目标设备ID>',
serviceId: '<服务UUID>',
characteristicId: '<特征值UUID>',
value: buffer,
success: (res) => {
console.log('写入成功', res);
},
fail: (err) => {
console.error('写入失败', err);
}
});
6. 最佳实践

权限管理：确保在 app.json 中声明蓝牙权限。

资源释放：离开页面或关闭小程序时，调用 wx.closeBLEConnection 和 wx.closeBluetoothAdapter。

调试建议：由于平台差异，需在真机上进行全面测试。

通过以上步骤即可实现微信小程序的全局蓝牙连接功能



###########################
###设备端的蓝牙控制代码：


class Dabble:
    connected = b'\xff\x00\x03\x00\x00\x00'

    # Gamepad keymapping
    up = b'\xff\x01\x01\x01\x02\x00\x01\x00'
    down = b'\xff\x01\x01\x01\x02\x00\x02\x00'
    left = b'\xff\x01\x01\x01\x02\x00\x04\x00'
    right = b'\xff\x01\x01\x01\x02\x00\x08\x00'

    triangle = b'\xff\x01\x01\x01\x02\x04\x00\x00'  # 三角形-右上
    cross = b'\xff\x01\x01\x01\x02\x10\x00\x00'  # 叉形-右下
    square = b'\xff\x01\x01\x01\x02\x20\x00\x00'  # 方形-右左
    circle = b'\xff\x01\x01\x01\x02\x08\x00\x00'  # 圆形-右右
    
    start = b'\xff\x01\x01\x01\x02\x01\x00\x00'
    select = b'\xff\x01\x01\x01\x02\x02\x00\x00'

    release = b'\xff\x01\x01\x01\x02\x00\x00\x00'

    


# This example demonstrates a UART periperhal.

# This example demonstrates the low-level bluetooth module. For most
# applications, we recommend using the higher-level aioble library which takes
# care of all IRQ handling and connection management. See
# https://github.com/micropython/micropython-lib/tree/master/micropython/bluetooth/aioble

import bluetooth
import struct
import time
from micropython import const
from machine import Pin, Timer


_ADV_TYPE_FLAGS = const(0x01)
_ADV_TYPE_NAME = const(0x09)
_ADV_TYPE_UUID16_COMPLETE = const(0x3)
_ADV_TYPE_UUID32_COMPLETE = const(0x5)
_ADV_TYPE_UUID128_COMPLETE = const(0x7)
_ADV_TYPE_UUID16_MORE = const(0x2)
_ADV_TYPE_UUID32_MORE = const(0x4)
_ADV_TYPE_UUID128_MORE = const(0x6)
_ADV_TYPE_APPEARANCE = const(0x19)

_ADV_MAX_PAYLOAD = const(31)

_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)

_FLAG_READ = const(0x0002)
_FLAG_WRITE_NO_RESPONSE = const(0x0004)
_FLAG_WRITE = const(0x0008)
_FLAG_NOTIFY = const(0x0010)

_UART_UUID = bluetooth.UUID("6E400006-B5A3-F393-E0A9-E50E24DCCA9E")
_UART_TX = (
    bluetooth.UUID("6E400007-B5A3-F393-E0A9-E50E24DCCA9E"),
    _FLAG_READ | _FLAG_NOTIFY,
)
_UART_RX = (
    bluetooth.UUID("6E400008-B5A3-F393-E0A9-E50E24DCCA9E"),
    _FLAG_WRITE | _FLAG_WRITE_NO_RESPONSE,
)
_UART_SERVICE = (
    _UART_UUID,
    (_UART_TX, _UART_RX),
)

def advertising_payload(limited_disc=False, br_edr=False, name=None, services=None, appearance=0):
    payload = bytearray()

    def _append(adv_type, value):
        nonlocal payload
        payload += struct.pack("BB", len(value) + 1, adv_type) + value

    _append(
        _ADV_TYPE_FLAGS,
        struct.pack("B", (0x01 if limited_disc else 0x02) + (0x18 if br_edr else 0x04)),
    )

    if name:
        _append(_ADV_TYPE_NAME, name)

    if services:
        for uuid in services:
            b = bytes(uuid)
            if len(b) == 2:
                _append(_ADV_TYPE_UUID16_COMPLETE, b)
            elif len(b) == 4:
                _append(_ADV_TYPE_UUID32_COMPLETE, b)
            elif len(b) == 16:
                _append(_ADV_TYPE_UUID128_COMPLETE, b)

    # See org.bluetooth.characteristic.gap.appearance.xml
    if appearance:
        _append(_ADV_TYPE_APPEARANCE, struct.pack("<h", appearance))

    if len(payload) > _ADV_MAX_PAYLOAD:
        raise ValueError("advertising payload too large")

    return payload


class BLESimplePeripheral:
    def __init__(self, ble, name="mpy-uart"):
        self.name=name
        self.led = Pin(2, Pin.OUT)
        self.timer = Timer(0)
        self._ble = ble
        self._ble.active(True)
        self._ble.irq(self._irq)
        ((self._handle_tx, self._handle_rx),) = self._ble.gatts_register_services((_UART_SERVICE,))
        self._connections = set()
        self._write_callback = None
        self._payload = advertising_payload(name=name, services=[_UART_UUID])
        self._advertise()
        self.disconnected()

    def connected(self):
        self.led.value(1)
        self.timer.deinit()

    def disconnected(self):
        self.timer.init(period=100, mode=Timer.PERIODIC, callback=lambda t: self.led.value(not self.led.value()))

    def _irq(self, event, data):
        # Track connections so we can send notifications.
        if event == _IRQ_CENTRAL_CONNECT:
            conn_handle, _, _ = data
            print("New connection", conn_handle)
            self._connections.add(conn_handle)
            self.connected()
        elif event == _IRQ_CENTRAL_DISCONNECT:
            conn_handle, _, _ = data
            print("Disconnected", conn_handle)
            self._connections.remove(conn_handle)
            # Start advertising again to allow a new connection.
            self._advertise()
            self.disconnected()
        elif event == _IRQ_GATTS_WRITE:
            conn_handle, value_handle = data
            value = self._ble.gatts_read(value_handle)
            if value_handle == self._handle_rx and self._write_callback:
                self._write_callback(value)

    def send(self, data):
        for conn_handle in self._connections:
            self._ble.gatts_notify(conn_handle, self._handle_tx, data)

    def is_connected(self):
        return len(self._connections) > 0

    def _advertise(self, interval_us=500000):
        print("Starting advertising")
        print("name: ", self.name)
        self._ble.gap_advertise(interval_us, adv_data=self._payload)

    def on_write(self, callback):
        self._write_callback = callback


def demo():
    ble = bluetooth.BLE()
    p = BLESimplePeripheral(ble, "MpyEsp32")

    def on_rx(v):
        print("RX", v)

    p.on_write(on_rx)

    i = 0
    while True:
        if p.is_connected():
            # Short burst of queued notifications.
            for _ in range(3):
                data = str(i) + "_"
                print("TX", data)
                p.send(data)
                i += 1
        time.sleep_ms(100)


if __name__ == "__main__":
    demo()