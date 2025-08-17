// app.js
const apiService = require('./utils/api');
const config = require('./utils/config');

App({
  globalData: {
    // 全局数据
    chatMessages: [],
    deviceState: 'idle', // idle, connecting, listening, speaking
    emotion: 'neutral',
    isConnected: false,
    // 音频相关
    innerAudioContext: null,
    // 页面列表
    pages: [],
    // 设备信息
    deviceInfo: null,
    // 网络类型
    networkType: 'unknown'
  },

  globalMethods: {
    // 机器人控制代码
    robotControls: {
      up: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x01, 0x00]),
      down: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x02, 0x00]),
      left: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x04, 0x00]),
      right: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x08, 0x00]),
      triangle: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x04, 0x00, 0x00]),  // 三角形-右上
      cross: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x10, 0x00, 0x00]),  // 叉形-右下
      square: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x20, 0x00, 0x00]),  // 方形-右左
      circle: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x08, 0x00, 0x00]),  // 圆形-右右
      start: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x01, 0x00, 0x00]),
      select: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x02, 0x00, 0x00]),
      release: new Uint8Array([0xff, 0x01, 0x01, 0x01, 0x02, 0x00, 0x00, 0x00])
    },

    // 发送机器人控制指令
    sendRobotControl: function(controlType) {
      if (!this.globalData.isConnected) {
        console.error('未连接到服务器');
        wx.showToast({
          title: '未连接到服务器',
          icon: 'none'
        });
        return;
      }

      const controlCode = this.robotControls[controlType];
      if (!controlCode) {
        console.error('无效的控制类型:', controlType);
        return;
      }

      apiService.sendControl(controlCode);
    },

    // 初始化API服务
    initApiService: function() {
      // 设置配置
      config.setAccessToken(this.globalData.accessToken || '');
      config.setDeviceId(this.globalData.deviceId || '');
      config.setClientId(this.globalData.clientId || '');
      
      // 初始化API服务
      apiService.init();
      
      // 监听连接事件
      apiService.on('connected', () => {
        this.globalData.isConnected = true;
        this.notifyAllPages('connectionChanged', { connected: true });
      });
      
      apiService.on('disconnected', (data) => {
        this.globalData.isConnected = false;
        this.notifyAllPages('connectionChanged', { connected: false, reason: data.reason });
      });
      
      // 监听消息事件
      apiService.on('tts', (data) => this.handleTTSMessage(data));
      apiService.on('stt', (data) => this.handleSTTMessage(data));
      apiService.on('llm', (data) => this.handleLLMMessage(data));
      apiService.on('emotion', (data) => this.handleEmotionMessage(data));
      apiService.on('message', (data) => this.handleServerMessage(data));
    },

    // 通知所有页面
    notifyAllPages: function(event, data) {
      if (this.globalData.pages) {
        this.globalData.pages.forEach(page => {
          if (page && page.onAppEvent) {
            page.onAppEvent(event, data);
          }
        });
      }
    },

    // 发送文本消息
    sendText: function(message) {
      if (!this.globalData.isConnected) {
        console.error('未连接到服务器');
        wx.showToast({
          title: '未连接到服务器',
          icon: 'none'
        });
        return;
      }

      // 添加用户消息到聊天记录
      const userMessage = {
        role: 'user',
        message: message,
        timestamp: new Date().toISOString()
      };

      this.globalData.chatMessages.push(userMessage);
      wx.setStorageSync('chat_messages', this.globalData.chatMessages);
      this.notifyAllPages('messageAdded', userMessage);

      // 发送到服务器
      apiService.sendText(message);
    },

    // 播放音频
    playAudio: function(src) {
      if (this.globalData.innerAudioContext) {
        this.globalData.innerAudioContext.destroy();
      }

      this.globalData.innerAudioContext = wx.createInnerAudioContext();
      this.globalData.innerAudioContext.src = src;
      this.globalData.innerAudioContext.play();
    },

    // 中止语音
    abortSpeaking: function() {
      console.log('中止语音');
      if (this.globalData.innerAudioContext) {
        this.globalData.innerAudioContext.stop();
      }
      apiService.sendAbortSpeaking();
    },

    // 设置设备状态
    setDeviceState: function(state) {
      this.globalData.deviceState = state;
      console.log('设备状态变更:', state);
      this.notifyAllPages('deviceStateChanged', { state });
    },

    // 设置表情
    setEmotion: function(emotion) {
      this.globalData.emotion = emotion;
      console.log('表情变更:', emotion);
      this.notifyAllPages('emotionChanged', { emotion });
    }
  },

  onLaunch: function() {
    console.log('小程序启动');
    
    // 初始化配置
    config.init();
    
    // 初始化全局数据
    this.globalData.chatMessages = wx.getStorageSync('chat_messages') || [];
    
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        console.log('网络类型:', res.networkType);
        this.globalData.networkType = res.networkType;
      }
    });

    // 获取设备信息
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.deviceInfo = res;
        // 生成设备ID
        const deviceId = res.platform + '_' + res.system + '_' + Date.now();
        const clientId = 'minipro_' + Date.now();
        
        // 设置全局配置
        this.globalData.deviceId = deviceId;
        this.globalData.clientId = clientId;
        config.setDeviceId(deviceId);
        config.setClientId(clientId);
        
        // 初始化API服务
        this.globalMethods.initApiService();
      }
    });
  },

  onShow: function() {
    console.log('小程序显示');
  },

  onHide: function() {
    console.log('小程序隐藏');
    // 断开WebSocket连接
    apiService.close();
  },

  onError: function(msg) {
    console.error('小程序错误:', msg);
  },

  // 处理服务器消息
  handleServerMessage: function(data) {
    console.log('收到服务器消息:', data);
    // 这里可以处理其他类型的消息
  },

  // 处理TTS消息
  handleTTSMessage: function(data) {
    const state = data.state || '';
    const text = data.text || '';

    if (state === 'start') {
      // TTS开始
      this.setDeviceState('speaking');
    } else if (state === 'sentence_start' && text) {
      // 收到TTS文本
      const assistantMessage = {
        role: 'assistant',
        message: text,
        timestamp: new Date().toISOString()
      };
      
      this.globalData.chatMessages.push(assistantMessage);
      wx.setStorageSync('chat_messages', this.globalData.chatMessages);
      this.notifyAllPages('messageAdded', assistantMessage);
    } else if (state === 'stop') {
      // TTS结束
      this.setDeviceState('idle');
    }
  },

  // 处理STT消息
  handleSTTMessage: function(data) {
    const text = data.text || '';
    if (text) {
      const userMessage = {
        role: 'user',
        message: text,
        timestamp: new Date().toISOString()
      };
      
      this.globalData.chatMessages.push(userMessage);
      wx.setStorageSync('chat_messages', this.globalData.chatMessages);
      this.notifyAllPages('messageAdded', userMessage);
    }
  },

  // 处理LLM消息
  handleLLMMessage: function(data) {
    // 这里可以处理LLM的响应
    console.log('LLM消息:', data);
  },

  // 处理表情消息
  handleEmotionMessage: function(data) {
    const emotion = data.emotion || 'neutral';
    this.setEmotion(emotion);
  }
});