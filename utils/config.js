// utils/config.js
// 服务端配置文件

// 默认配置
const defaultConfig = {
  // 服务器配置
  server: {
    // WebSocket服务器地址
    websocketUrl: 'wss://api.tenclass.net/xiaozhi/v1/',
    // HTTP API地址
    apiUrl: 'https://api.tenclass.net/xiaozhi/v1',
    // 访问令牌
    accessToken: 'test-token',
    // 设备ID
    deviceId: 'e0:d5:5e:ca:e0:e9',
    // 客户端ID
    clientId: '58f42538-f2c2-47e8-8854-2dd78af47bd3'
  },

  // 音频配置
  audio: {
    // 录音设置
    recording: {
      duration: 60000, // 最长录音时间（毫秒）
      sampleRate: 16000, // 采样率
      numberOfChannels: 1, // 声道数
      encodeBitRate: 96000, // 编码比特率
      format: 'mp3' // 音频格式
    },
    // 音频播放设置
    playback: {
      volume: 1.0, // 音量
      autoplay: true // 自动播放
    }
  },

  // 界面配置
  ui: {
    // 聊天界面
    chat: {
      // 最大消息数量
      maxMessages: 100,
      // 消息历史
      messageHistory: true,
      // 自动滚动到底部
      autoScroll: true
    },
    // 状态指示器
    status: {
      // 连接状态颜色
      connection: {
        connected: '#07c160', // 已连接 - 绿色
        disconnected: '#999999' // 未连接 - 灰色
      },
      // 设备状态颜色
      device: {
        idle: '#666666', // 空闲 - 灰色
        connecting: '#ff9500', // 连接中 - 橙色
        listening: '#07c160', // 聆听中 - 绿色
        speaking: '#2b85e4' // 说话中 - 蓝色
      }
    }
  },

  // 功能配置
  features: {
    // 语音识别
    speechToText: true,
    // 文字转语音
    textToSpeech: true,
    // 录音功能
    recording: true,
    // 消息历史
    messageHistory: true,
    // 分享功能
    sharing: true,
    // 清空聊天
    clearChat: true
  },

  // 调试配置
  debug: {
    // 是否启用调试模式
    enabled: false,
    // 日志级别
    logLevel: 'info', // debug, info, warn, error
    // 网络请求日志
    networkLogs: false,
    // 消息日志
    messageLogs: false
  }
};

// 默认efuse配置
const defaultEfuse = {
  // 设备配置
  device: {
    id: 'e0:d5:5e:ca:e0:e9',
    name: '',
    type: 'miniprogram'
  },
  // 安全配置
  security: {
    encrypted: false,
    debugMode: false
  },
  // 限制配置
  limits: {
    maxMessages: 100,
    maxMessageLength: 1000
  }
};

// 运行时配置
let runtimeConfig = JSON.parse(JSON.stringify(defaultConfig));
let runtimeEfuse = JSON.parse(JSON.stringify(defaultEfuse));

// 从本地存储加载配置
const loadConfigFromStorage = () => {
  try {
    const storedConfig = wx.getStorageSync('app_config');
    if (storedConfig) {
      runtimeConfig = JSON.parse(storedConfig);
    }
    
    const storedEfuse = wx.getStorageSync('app_efuse');
    if (storedEfuse) {
      runtimeEfuse = JSON.parse(storedEfuse);
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }
};

// 保存配置到本地存储
const saveConfigToStorage = () => {
  try {
    wx.setStorageSync('app_config', JSON.stringify(runtimeConfig));
    wx.setStorageSync('app_efuse', JSON.stringify(runtimeEfuse));
  } catch (error) {
    console.error('保存配置失败:', error);
  }
};

// 从服务器加载配置
const loadConfigFromServer = () => {
  return new Promise((resolve, reject) => {
    // 这里应该调用API获取配置
    // 由于没有具体的API端点，我们先返回模拟数据
    setTimeout(() => {
      const mockConfig = JSON.parse(JSON.stringify(defaultConfig));
      const mockEfuse = JSON.parse(JSON.stringify(defaultEfuse));
      
      runtimeConfig = mockConfig;
      runtimeEfuse = mockEfuse;
      saveConfigToStorage();
      resolve({ config: mockConfig, efuse: mockEfuse });
    }, 500);
  });
};

// 获取配置
const getConfig = () => {
  return runtimeConfig;
};

// 获取efuse配置
const getEfuse = () => {
  return runtimeEfuse;
};

// 更新配置
const updateConfig = (newConfig) => {
  runtimeConfig = { ...runtimeConfig, ...newConfig };
  saveConfigToStorage();
  return runtimeConfig;
};

// 更新efuse配置
const updateEfuse = (newEfuse) => {
  runtimeEfuse = { ...runtimeEfuse, ...newEfuse };
  saveConfigToStorage();
  return runtimeEfuse;
};

// 重置配置
const resetConfig = () => {
  runtimeConfig = JSON.parse(JSON.stringify(defaultConfig));
  runtimeEfuse = JSON.parse(JSON.stringify(defaultEfuse));
  saveConfigToStorage();
};

// 强制重置配置为默认值
const forceResetToDefault = () => {
  runtimeConfig = JSON.parse(JSON.stringify(defaultConfig));
  runtimeEfuse = JSON.parse(JSON.stringify(defaultEfuse));
  saveConfigToStorage();
  console.log('配置已强制重置为默认值');
};

// 获取WebSocket URL
const getWebSocketUrl = () => {
  return runtimeConfig.server.websocketUrl;
};

// 获取API URL
const getApiUrl = () => {
  return runtimeConfig.server.apiUrl;
};

// 获取访问令牌
const getAccessToken = () => {
  return runtimeConfig.server.accessToken;
};

// 设置访问令牌
const setAccessToken = (token) => {
  runtimeConfig.server.accessToken = token;
  saveConfigToStorage();
  return token;
};

// 获取设备ID
const getDeviceId = () => {
  return runtimeEfuse.device.id || runtimeConfig.server.deviceId;
};

// 设置设备ID
const setDeviceId = (id) => {
  runtimeEfuse.device.id = id;
  runtimeConfig.server.deviceId = id;
  saveConfigToStorage();
  return id;
};

// 获取客户端ID
const getClientId = () => {
  return runtimeEfuse.clientId || runtimeConfig.server.clientId;
};

// 设置客户端ID
const setClientId = (id) => {
  runtimeEfuse.clientId = id;
  runtimeConfig.server.clientId = id;
  saveConfigToStorage();
  return id;
};

// 初始化配置
const init = () => {
  loadConfigFromStorage();
};

// 导出配置
module.exports = {
  // 配置管理
  getConfig,
  getEfuse,
  updateConfig,
  updateEfuse,
  resetConfig,
  forceResetToDefault,
  loadConfigFromStorage,
  saveConfigToStorage,
  loadConfigFromServer,
  
  // API方法
  getWebSocketUrl,
  getApiUrl,
  getAccessToken,
  setAccessToken,
  getDeviceId,
  setDeviceId,
  getClientId,
  setClientId,
  
  // 默认配置
  defaultConfig,
  defaultEfuse,
  
  // 初始化
  init
};