// utils/api.js
// API服务模块

const config = require('./config');

class ApiService {
  constructor() {
    // 初始化配置
    this.baseURL = config.getApiUrl();
    this.websocketUrl = config.getWebSocketUrl();
    this.accessToken = config.getAccessToken();
    this.deviceId = config.getDeviceId();
    this.clientId = config.getClientId();
    
    // 调试日志
    console.log('API服务配置:', {
      baseURL: this.baseURL,
      websocketUrl: this.websocketUrl,
      accessToken: this.accessToken,
      deviceId: this.deviceId,
      clientId: this.clientId
    });
    
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // WebSocket连接配置
    this.pingInterval = 20000; // 心跳间隔20秒
    this.pingTimeout = 20000; // ping超时20秒
    this.closeTimeout = 10000; // 关闭超时10秒
    this.maxMessageSize = 10 * 1024 * 1024; // 最大消息10MB
    
    // 连接状态监控
    this._isClosing = false;
    this._lastPingTime = null;
    this._lastPongTime = null;
    this._heartbeatTimer = null;
    this._connectionMonitorTimer = null;
    
    // 音频数据缓冲区
    this.audioBuffer = [];
    this.isAudioChannelOpened = false;
    
    // 消息处理器映射
    this._messageHandlers = {
      'tts': this.handleTTSMessage.bind(this),
      'stt': this.handleSTTMessage.bind(this),
      'llm': this.handleLLMMessage.bind(this),
      'iot': this.handleIoTMessage.bind(this),
      'mcp': this.handleMCPMessage.bind(this),
      'emotion': this.handleEmotionMessage.bind(this),
      'audio': this.handleAudioMessage.bind(this)
    };
  }

  // 初始化API服务
  init() {
    console.log('初始化API服务...');
    // 确保配置已加载
    config.loadConfigFromStorage();
    // 重新获取配置
    this.baseURL = config.getApiUrl();
    this.websocketUrl = config.getWebSocketUrl();
    this.accessToken = config.getAccessToken();
    this.deviceId = config.getDeviceId();
    this.clientId = config.getClientId();
    
    console.log('重新加载的配置:', {
      baseURL: this.baseURL,
      websocketUrl: this.websocketUrl,
      accessToken: this.accessToken,
      deviceId: this.deviceId,
      clientId: this.clientId
    });
    
    this.setupWebSocket();
  }

  // 设置WebSocket连接
  setupWebSocket() {
    if (this.socket && this.isConnected) {
      console.log('WebSocket已连接，跳过重新连接');
      return;
    }

    console.log('正在连接WebSocket服务器...', this.websocketUrl);

    // 创建WebSocket连接
    this.socket = wx.connectSocket({
      url: this.websocketUrl,
      protocols: ['chat'],
      success: () => {
        console.log('WebSocket连接成功');
      },
      fail: (err) => {
        console.error('WebSocket连接失败:', err);
        // 延迟重连
        setTimeout(() => {
          this.handleReconnect();
        }, 2000);
      }
    });

    // 监听WebSocket事件
    this.socket.onOpen(() => {
      console.log('WebSocket已打开');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnected();
    });

    this.socket.onMessage((res) => {
      this.handleMessage(res.data);
    });

    this.socket.onError((err) => {
      console.error('WebSocket错误:', err);
      this.isConnected = false;
      this.handleConnectionLoss('连接错误');
    });

    this.socket.onClose((res) => {
      console.log('WebSocket已关闭:', res.code, res.reason);
      // 只有在非正常关闭时才处理连接丢失
      if (res.code !== 1000 && res.code !== 1005) {
        this.isConnected = false;
        this.handleConnectionLoss('连接已关闭');
      } else {
        // 正常关闭，只更新连接状态
        this.isConnected = false;
        this.onDisconnected('连接正常关闭');
      }
    });
  }

  // 处理重连
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      this.onDisconnected('重连失败');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`尝试第 ${this.reconnectAttempts} 次重连，延迟 ${delay}ms`);
    
    setTimeout(() => {
      this.setupWebSocket();
    }, delay);
  }

  // 启动心跳机制
  startHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
    }
    
    this._heartbeatTimer = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.sendPing();
      }
    }, this.pingInterval);
  }

  // 发送心跳ping
  sendPing() {
    if (!this.socket || !this.isConnected) {
      return;
    }

    try {
      this._lastPingTime = Date.now();
      this.socket.send({
        data: JSON.stringify({ type: 'ping', timestamp: this._lastPingTime })
      });
    } catch (error) {
      console.error('发送心跳失败:', error);
    }
  }

  // 启动连接监控
  startConnectionMonitor() {
    if (this._connectionMonitorTimer) {
      clearInterval(this._connectionMonitorTimer);
    }
    
    this._connectionMonitorTimer = setInterval(() => {
      this.checkConnectionHealth();
    }, 5000); // 每5秒检查一次
  }

  // 检查连接健康状态
  checkConnectionHealth() {
    if (!this.socket || !this.isConnected) {
      return;
    }

    // 检查连接是否已关闭
    if (this.socket.readyState === wx.SocketState.CLOSED) {
      this.handleConnectionLoss('连接已关闭');
      return;
    }

    // 检查最后一次pong响应时间
    if (this._lastPingTime && this._lastPongTime) {
      const timeSinceLastPong = Date.now() - this._lastPongTime;
      if (timeSinceLastPong > this.pingTimeout) {
        this.handleConnectionLoss('心跳pong超时');
        return;
      }
    }
  }

  // 处理连接丢失
  handleConnectionLoss(reason) {
    console.warn('连接丢失:', reason);
    
    // 更新连接状态
    const wasConnected = this.isConnected;
    this.isConnected = false;
    
    // 停止心跳和监控
    this.stopHeartbeat();
    this.stopConnectionMonitor();
    
    // 通知连接状态变化
    if (wasConnected) {
      this.emit('connectionChanged', { connected: false, reason });
    }
    
    // 清理连接
    this.cleanupConnection();
    
    // 尝试自动重连
    if (!this._isClosing && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.handleReconnect();
    }
  }

  // 停止心跳机制
  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  // 停止连接监控
  stopConnectionMonitor() {
    if (this._connectionMonitorTimer) {
      clearInterval(this._connectionMonitorTimer);
      this._connectionMonitorTimer = null;
    }
  }

  // 清理连接
  cleanupConnection() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // 通知音频通道关闭
    if (this.isAudioChannelOpened) {
      this.isAudioChannelOpened = false;
      this.emit('audioChannelClosed');
    }
  }

  // 连接成功回调
  onConnected() {
    console.log('WebSocket连接成功');
    
    // 启动心跳和连接监控
    this.startHeartbeat();
    this.startConnectionMonitor();
    
    // 发送客户端hello消息
    const helloMessage = {
      type: 'hello',
      version: 1,
      features: {
        mcp: true
      },
      transport: 'websocket',
      audio_params: {
        format: 'opus',
        sample_rate: 16000,
        channels: 1,
        frame_duration: 20
      },
      timestamp: Date.now()
    };

    this.send(helloMessage);
    
    // 通知连接状态变化
    this.emit('connectionChanged', { connected: true, reason: '连接成功' });
  }

  // 连接断开回调
  onDisconnected(reason = '连接断开') {
    console.log('WebSocket连接断开:', reason);
    this.isConnected = false;
    
    // 停止心跳和监控
    this.stopHeartbeat();
    this.stopConnectionMonitor();
    
    // 通知所有监听器
    this.emit('disconnected', { reason });
    
    // 通知连接状态变化
    this.emit('connectionChanged', { connected: false, reason });
  }

  // 发送消息
  send(message) {
    if (!this.isConnected || !this.socket) {
      console.error('WebSocket未连接，无法发送消息');
      return false;
    }

    try {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send({
        data: data
      });
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  }

  // 处理接收到的消息
  handleMessage(data) {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('收到消息:', message);

      // 处理pong响应
      if (message.type === 'pong') {
        this._lastPongTime = Date.now();
        return;
      }

      // 根据消息类型分发处理
      const msgType = message.type || '';
      const handler = this._messageHandlers[msgType];
      
      if (handler) {
        handler(message);
      } else {
        console.log('未知消息类型:', msgType);
      }

      // 触发消息事件
      this.emit('message', message);
    } catch (error) {
      console.error('处理消息失败:', error);
      this.emit('messageError', { error, data });
    }
  }

  // 处理音频消息
  handleAudioMessage(message) {
    console.log('收到音频消息:', message);
    
    if (message.data) {
      // 将音频数据添加到缓冲区
      this.audioBuffer.push(message.data);
      
      // 如果音频通道已打开，触发音频事件
      if (this.isAudioChannelOpened) {
        this.emit('audioData', message.data);
      }
    }
    
    this.emit('audio', message);
  }

  // 处理TTS消息
  handleTTSMessage(message) {
    console.log('收到TTS消息:', message);
    
    const state = message.state || '';
    if (state === 'start') {
      this.emit('ttsStart', message);
    } else if (state === 'stop') {
      this.emit('ttsStop', message);
    } else if (state === 'sentence_start') {
      this.emit('ttsSentenceStart', message);
    }
    
    this.emit('tts', message);
  }

  // 处理STT消息
  handleSTTMessage(message) {
    console.log('收到STT消息:', message);
    
    const state = message.state || '';
    if (state === 'start') {
      this.emit('sttStart', message);
    } else if (state === 'stop') {
      this.emit('sttStop', message);
    } else if (state === 'partial_result') {
      this.emit('sttPartialResult', message);
    } else if (state === 'final_result') {
      this.emit('sttFinalResult', message);
    }
    
    this.emit('stt', message);
  }

  // 处理LLM消息
  handleLLMMessage(message) {
    console.log('收到LLM消息:', message);
    
    const state = message.state || '';
    if (state === 'start') {
      this.emit('llmStart', message);
    } else if (state === 'stop') {
      this.emit('llmStop', message);
    } else if (state === 'content') {
      this.emit('llmContent', message);
    }
    
    this.emit('llm', message);
  }

  // 处理表情消息
  handleEmotionMessage(message) {
    console.log('收到表情消息:', message);
    this.emit('emotion', message);
  }

  // 处理IoT消息
  handleIoTMessage(message) {
    console.log('收到IoT消息:', message);
    this.emit('iot', message);
  }

  // 处理MCP消息
  handleMCPMessage(message) {
    console.log('收到MCP消息:', message);
    this.emit('mcp', message);
  }

  // 处理hello消息
  handleHelloMessage(message) {
    console.log('收到服务器hello消息:', message);
    this.emit('hello', message);
  }

  // 发送文本消息
  sendText(text) {
    const message = {
      type: 'llm',
      text: text,
      timestamp: Date.now()
    };
    return this.send(message);
  }

  // 发送音频数据
  sendAudio(audioData) {
    const message = {
      type: 'audio',
      data: audioData,
      timestamp: Date.now()
    };
    return this.send(message);
  }

  // 发送唤醒词检测
  sendWakeWordDetected(text) {
    const message = {
      type: 'wake_word',
      text: text,
      timestamp: Date.now()
    };
    return this.send(message);
  }

  // 发送开始监听
  sendStartListening(mode = 'auto_stop') {
    const message = {
      type: 'start_listening',
      mode: mode,
      timestamp: Date.now()
    };
    return this.send(message);
  }

  // 发送停止监听
  sendStopListening() {
    const message = {
      type: 'stop_listening',
      timestamp: Date.now()
    };
    return this.send(message);
  }

  // 发送中止语音
  sendAbortSpeaking(reason = 'none') {
    const message = {
      type: 'abort_speaking',
      reason: reason,
      timestamp: Date.now()
    };
    return this.send(message);
  }

  // 发送IoT描述符
  sendIoTDescriptors(descriptors) {
    const message = {
      type: 'iot_descriptors',
      descriptors: descriptors,
      timestamp: Date.now()
    };
    return this.send(message);
  }

  // 发送IoT状态
  sendIoTStates(states) {
    const message = {
      type: 'iot_states',
      states: states,
      timestamp: Date.now()
    };
    return this.send(message);
  }

  // 发送MCP消息
  sendMCPMessage(message) {
    const msg = {
      type: 'mcp',
      payload: message,
      timestamp: Date.now()
    };
    return this.send(msg);
  }

  // 事件监听
  on(event, callback) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event).add(callback);
  }

  // 移除事件监听
  off(event, callback) {
    if (this.messageHandlers.has(event)) {
      const handlers = this.messageHandlers.get(event);
      if (callback) {
        handlers.delete(callback);
      } else {
        handlers.clear();
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.messageHandlers.has(event)) {
      const handlers = this.messageHandlers.get(event);
      handlers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('事件处理错误:', error);
        }
      });
    }
  }

  // 关闭连接
  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.messageHandlers.clear();
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      websocket_closed: this.socket ? this.socket.readyState === wx.SocketState.CLOSED : true,
      is_closing: this._isClosing,
      last_pong_time: this._lastPongTime,
      websocket_url: this.websocketUrl
    };
  }

  // 打开音频通道
  openAudioChannel() {
    if (this.isAudioChannelOpened) {
      console.log('音频通道已打开');
      return;
    }

    this.isAudioChannelOpened = true;
    this.audioBuffer = []; // 清空音频缓冲区
    
    // 发送音频通道打开消息
    const message = {
      type: 'audio_channel_opened',
      timestamp: Date.now()
    };
    this.send(message);
    
    this.emit('audioChannelOpened');
  }

  // 关闭音频通道
  closeAudioChannel() {
    if (!this.isAudioChannelOpened) {
      console.log('音频通道未打开');
      return;
    }

    this.isAudioChannelOpened = false;
    
    // 发送音频通道关闭消息
    const message = {
      type: 'audio_channel_closed',
      timestamp: Date.now()
    };
    this.send(message);
    
    // 清空音频缓冲区
    this.audioBuffer = [];
    
    this.emit('audioChannelClosed');
  }

  // 获取音频缓冲区
  getAudioBuffer() {
    return this.audioBuffer;
  }

  // 清空音频缓冲区
  clearAudioBuffer() {
    this.audioBuffer = [];
  }

  // 设置网络错误回调
  setNetworkErrorCallback(callback) {
    this.on('networkError', callback);
  }

  // 设置音频数据回调
  setAudioDataCallback(callback) {
    this.on('audioData', callback);
  }

  // 设置连接状态变化回调
  setConnectionStateChangedCallback(callback) {
    this.on('connectionChanged', callback);
  }

  // 设置消息处理回调
  setMessageHandler(type, callback) {
    if (this._messageHandlers[type]) {
      this._messageHandlers[type] = callback.bind(this);
    }
  }

  // 发送错误消息
  sendError(type, code, message) {
    const error_message = {
      type: 'error',
      error_type: type,
      error_code: code,
      error_message: message,
      timestamp: Date.now()
    };
    return this.send(error_message);
  }

  // 发送调试信息
  sendDebugInfo(info) {
    if (config.getConfig().debug.enabled) {
      const debug_message = {
        type: 'debug',
        info: info,
        timestamp: Date.now()
      };
      this.send(debug_message);
    }
  }
}

// 创建单例实例
const apiService = new ApiService();

module.exports = apiService;