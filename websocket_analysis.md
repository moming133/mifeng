# WebSocket通讯关键代码分析

## 1. 整体架构设计

这个项目采用了**协议抽象层**的设计模式，通过 [`Protocol`](src/protocols/protocol.py:9) 基类定义统一的接口，具体实现包括：

- **WebSocket协议**: [`WebsocketProtocol`](src/protocols/websocket_protocol.py:18)
- **MQTT协议**: [`MqttProtocol`](src/protocols/mqtt_protocol.py)

## 2. WebSocket核心实现

### 2.1 连接管理 ([`WebsocketProtocol`](src/protocols/websocket_protocol.py:18))

```python
class WebsocketProtocol(Protocol):
    def __init__(self):
        super().__init__()
        self.websocket = None
        self.connected = False
        self._is_closing = False
        self._reconnect_attempts = 0
        self._auto_reconnect_enabled = False
```

**关键特性**：
- 支持SSL/TLS加密连接（wss://）
- 自动重连机制
- 连接状态监控
- 心跳保活

### 2.2 连接建立流程 ([`connect()`](src/protocols/websocket_protocol.py:57))

```python
async def connect(self) -> bool:
    # 1. 创建SSL上下文（如果需要）
    current_ssl_context = None
    if self.WEBSOCKET_URL.startswith("wss://"):
        current_ssl_context = ssl_context
    
    # 2. 建立WebSocket连接
    self.websocket = await websockets.connect(
        uri=self.WEBSOCKET_URL,
        ssl=current_ssl_context,
        additional_headers=self.HEADERS,
        ping_interval=20,  # 心跳间隔20秒
        ping_timeout=20,   # ping超时20秒
        close_timeout=10,  # 关闭超时10秒
        max_size=10 * 1024 * 1024,  # 最大消息10MB
        compression=None,  # 禁用压缩
    )
    
    # 3. 启动消息处理循环
    asyncio.create_task(self._message_handler())
    
    # 4. 发送hello消息进行握手
    hello_message = {
        "type": "hello",
        "version": 1,
        "features": {"mcp": True},
        "transport": "websocket",
        "audio_params": {
            "format": "opus",
            "sample_rate": AudioConfig.INPUT_SAMPLE_RATE,
            "channels": AudioConfig.CHANNELS,
            "frame_duration": AudioConfig.FRAME_DURATION,
        },
    }
    await self.send_text(json.dumps(hello_message))
    
    # 5. 等待服务器hello响应
    await asyncio.wait_for(self.hello_received.wait(), timeout=10.0)
```

### 2.3 消息处理机制 ([`_message_handler()`](src/protocols/websocket_protocol.py:350))

```python
async def _message_handler(self):
    async for message in self.websocket:
        if isinstance(message, str):
            # 处理JSON消息
            data = json.loads(message)
            msg_type = data.get("type")
            if msg_type == "hello":
                await self._handle_server_hello(data)
            else:
                if self._on_incoming_json:
                    self._on_incoming_json(data)
        elif isinstance(message, bytes):
            # 处理二进制音频数据
            if self._on_incoming_audio:
                self._on_incoming_audio(message)
```

### 2.4 连接健康监控

**心跳机制**：
```python
async def _heartbeat_loop(self):
    while self.websocket and not self._is_closing:
        await asyncio.sleep(self._ping_interval)
        self._last_ping_time = time.time()
        pong_waiter = await self.websocket.ping()
        
        try:
            await asyncio.wait_for(pong_waiter, timeout=self._ping_timeout)
            self._last_pong_time = time.time()
        except asyncio.TimeoutError:
            await self._handle_connection_loss("心跳pong超时")
```

**连接监控**：
```python
async def _connection_monitor(self):
    while self.websocket and not self._is_closing:
        await asyncio.sleep(5)  # 每5秒检查一次
        if self.websocket.closed:
            await self._handle_connection_loss("连接已关闭")
```

## 3. 应用层集成

### 3.1 协议回调设置 ([`_setup_protocol_callbacks()`](src/application.py:427))

```python
def _setup_protocol_callbacks(self):
    self.protocol.on_network_error(self._on_network_error)
    self.protocol.on_incoming_audio(self._on_incoming_audio)
    self.protocol.on_incoming_json(self._on_incoming_json)
    self.protocol.on_audio_channel_opened(self._on_audio_channel_opened)
    self.protocol.on_audio_channel_closed(self._on_audio_channel_closed)
```

### 3.2 音频数据流处理

**发送音频**：
```python
def _on_encoded_audio(self, encoded_data: bytes):
    if (self.device_state == DeviceState.LISTENING 
            and self.protocol 
            and self.protocol.is_audio_channel_opened()):
        
        # 线程安全地调度到主事件循环
        if self._main_loop and not self._main_loop.is_closed():
            self._main_loop.call_soon_threadsafe(
                self._schedule_audio_send, encoded_data
            )
```

**接收音频**：
```python
def _on_incoming_audio(self, data):
    if self.device_state == DeviceState.SPEAKING and self.audio_codec:
        task = asyncio.create_task(self.audio_codec.write_audio(data))
```

## 4. 消息类型和处理

### 4.1 主要消息类型

根据 [`application.py`](src/application.py:112) 中的处理器映射：

```python
self._message_handlers = {
    "tts": self._handle_tts_message,    # 文本转语音
    "stt": self._handle_stt_message,    # 语音转文本
    "llm": self._handle_llm_message,    # 大语言模型
    "iot": self._handle_iot_message,    # 物联网控制
    "mcp": self._handle_mcp_message,    # MCP工具调用
}
```

### 4.2 关键消息处理示例

**TTS消息处理**：
```python
async def _handle_tts_message(self, data):
    state = data.get("state", "")
    if state == "start":
        await self._handle_tts_start()
    elif state == "stop":
        await self._handle_tts_stop()
    elif state == "sentence_start":
        text = data.get("text", "")
        self.set_chat_message("assistant", text)
```

## 5. 系统初始化和启动流程

### 5.1 启动流程 ([`main.py`](main.py:169))

```python
async def main():
    # 1. 设置日志
    setup_logging()
    
    # 2. 解析命令行参数
    args = parse_args()
    
    # 3. 处理设备激活
    if not args.skip_activation:
        activation_success = await handle_activation(args.mode)
        if not activation_success:
            return 1
    
    # 4. 创建并启动应用程序
    app = Application.get_instance()
    return await app.run(mode=args.mode, protocol=args.protocol)
```

### 5.2 应用程序初始化 ([`_initialize_components()`](src/application.py:265))

```python
async def _initialize_components(self, mode: str, protocol: str):
    # 1. 设置显示类型
    self._set_display_type(mode)
    
    # 2. 初始化MCP服务器
    self._initialize_mcp_server()
    
    # 3. 设置设备状态
    await self._set_device_state(DeviceState.IDLE)
    
    # 4. 初始化物联网设备
    await self._initialize_iot_devices()
    
    # 5. 初始化音频编解码器
    await self._initialize_audio()
    
    # 6. 设置协议
    self._set_protocol_type(protocol)
    
    # 7. 初始化唤醒词检测
    await self._initialize_wake_word_detector()
    
    # 8. 设置协议回调
    self._setup_protocol_callbacks()
```

## 6. 关键设计特点

1. **异步架构**: 全面使用asyncio，支持高并发处理
2. **协议抽象**: 通过Protocol基类实现多协议支持
3. **连接管理**: 自动重连、心跳保活、状态监控
4. **音频流处理**: 实时音频编解码和传输
5. **消息路由**: 基于消息类型的分发机制
6. **错误处理**: 完善的异常处理和恢复机制
7. **线程安全**: 音频回调的线程安全处理

## 7. 主要文件结构

```
src/
├── protocols/
│   ├── protocol.py          # 协议基类
│   ├── websocket_protocol.py # WebSocket实现
│   └── mqtt_protocol.py     # MQTT实现
├── application.py           # 应用主逻辑
├── core/
│   └── system_initializer.py # 系统初始化
└── main.py                 # 程序入口
```

## 8. 关键配置

### 8.1 WebSocket连接配置

根据 [`config.json`](config/config.json:7) 配置文件，WebSocket连接的服务器地址为：

```json
"WEBSOCKET_URL": "wss://api.tenclass.net/xiaozhi/v1/"
```

**服务器信息**：
- **服务器地址**: `api.tenclass.net`
- **API路径**: `/xiaozhi/v1/`
- **协议**: `wss://` (WebSocket Secure)
- **完整URL**: `wss://api.tenclass.net/xiaozhi/v1/`

**认证配置**：
```json
"WEBSOCKET_ACCESS_TOKEN": "test-token"
```

**设备标识**：
```json
"DEVICE_ID": "e0:d5:5e:ca:e0:e9",
"CLIENT_ID": "58f42538-f2c2-47e8-8854-2dd78af47bd3"
```

### 8.2 服务器端点

WebSocket连接的主要服务器端点包括：

1. **主WebSocket服务器**: `wss://api.tenclass.net/xiaozhi/v1/`
2. **OTA配置服务器**: `https://api.tenclass.net/xiaozhi/ota/`
3. **授权服务器**: `https://xiaozhi.me/`

### 8.3 音频参数配置

```python
audio_params = {
    "format": "opus",
    "sample_rate": AudioConfig.INPUT_SAMPLE_RATE,
    "channels": AudioConfig.CHANNELS,
    "frame_duration": AudioConfig.FRAME_DURATION,
}
```

## 9. 错误处理机制

### 9.1 连接丢失处理

```python
async def _handle_connection_loss(self, reason: str):
    logger.warning(f"连接丢失: {reason}")
    
    # 更新连接状态
    was_connected = self.connected
    self.connected = False
    
    # 通知连接状态变化
    if self._on_connection_state_changed and was_connected:
        self._on_connection_state_changed(False, reason)
    
    # 清理连接
    await self._cleanup_connection()
    
    # 通知音频通道关闭
    if self._on_audio_channel_closed:
        await self._on_audio_channel_closed()
    
    # 尝试自动重连
    if (not self._is_closing and self._auto_reconnect_enabled 
            and self._reconnect_attempts < self._max_reconnect_attempts):
        await self._attempt_reconnect(reason)
```

### 9.2 自动重连机制

```python
async def _attempt_reconnect(self, original_reason: str):
    self._reconnect_attempts += 1
    
    # 指数退避，最大30秒
    await asyncio.sleep(min(self._reconnect_attempts * 2, 30))
    
    try:
        success = await self.connect()
        if success:
            logger.info("自动重连成功")
        else:
            logger.warning(f"自动重连失败 ({self._reconnect_attempts}/{self._max_reconnect_attempts})")
    except Exception as e:
        logger.error(f"重连过程中出错: {e}")
```

## 10. 总结

这个WebSocket通讯实现展现了一个成熟的实时音频通讯系统架构，具备以下特点：

- **高可靠性**: 自动重连、心跳保活、完善的错误处理
- **高性能**: 异步架构、高效的消息路由
- **可扩展性**: 协议抽象、模块化设计
- **实时性**: 低延迟的音频数据传输
- **安全性**: SSL/TLS加密、认证机制

该架构为构建复杂的实时通讯应用提供了良好的基础和参考。