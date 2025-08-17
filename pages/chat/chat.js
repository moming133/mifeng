// pages/chat/chat.js
const app = getApp();
const apiService = require('../../utils/api');

Page({
    data: {
        chatMessages: [],
        inputValue: '',
        deviceState: 'idle',
        emotion: 'neutral',
        loading: false,
        scrollTop: 0,
        toView: '',
        hasNetwork: true,
        isConnected: false,
        isTyping: false,
        typingTimer: null
    },

    onLoad: function () {
        // 使用setData确保数据更新，添加默认值
        this.setData({
            chatMessages: app.globalData.chatMessages || [],
            deviceState: app.globalData.deviceState || 'idle',
            emotion: app.globalData.emotion || 'neutral',
            isConnected: app.globalData.isConnected || false
        });

        // 监听全局消息变化
        this.setupGlobalListeners();

        // 检查网络状态
        this.checkNetworkStatus();

        // 注册页面到全局
        if (!app.globalData.pages) {
            app.globalData.pages = [];
        }
        app.globalData.pages.push(this);

        // 延迟初始化API服务，确保页面完全渲染
        setTimeout(() => {
            this.initApiService();
        }, 100);
    },

    onShow: function () {
        // 确保消息是最新的
        this.setData({
            chatMessages: app.globalData.chatMessages || [],
            deviceState: app.globalData.deviceState || 'idle',
            emotion: app.globalData.emotion || 'neutral',
            isConnected: app.globalData.isConnected || false
        });

        // 检查网络状态
        this.checkNetworkStatus();

        // 滚动到底部
        this.scrollToBottom();
    },

    onHide: function () {
        // 从全局页面列表中移除
        if (app.globalData.pages) {
            const index = app.globalData.pages.indexOf(this);
            if (index > -1) {
                app.globalData.pages.splice(index, 1);
            }
        }
    },

    // 应用事件回调
    onAppEvent: function (event, data) {
        switch (event) {
            case 'messageAdded':
                this.handleMessageAdded(data);
                break;
            case 'deviceStateChanged':
                this.setData({ deviceState: data.state });
                break;
            case 'emotionChanged':
                this.setData({ emotion: data.emotion });
                break;
            case 'connectionChanged':
                this.setData({ isConnected: data.connected });
                break;
        }
    },

    // 处理新消息
    handleMessageAdded: function (message) {
        const messages = this.data.chatMessages;
        messages.push(message);
        this.setData({
            chatMessages: messages,
            toView: `msg-${messages.length - 1}`
        });
        this.scrollToBottom();
    },

    setupGlobalListeners: function () {
        // 监听聊天消息变化
        this.updateChatMessages();
    },

    // 更新聊天消息
    updateChatMessages: function () {
        const messages = app.globalData.chatMessages || [];
        this.setData({
            chatMessages: messages,
            toView: messages.length > 0 ? `msg-${messages.length - 1}` : ''
        });
    },

    // 检查网络状态
    checkNetworkStatus: function () {
        wx.getNetworkType({
            success: (res) => {
                this.setData({
                    hasNetwork: res.networkType !== 'none'
                });
            },
            fail: () => {
                this.setData({
                    hasNetwork: false
                });
            }
        });
    },

    // 输入框变化
    onInputChange: function (e) {
        this.setData({
            inputValue: e.detail.value
        });
    },

    // 发送消息
    sendMessage: function () {
        const message = this.data.inputValue.trim();
        if (!message) {
            return;
        }

        if (!this.data.hasNetwork) {
            wx.showToast({
                title: '网络连接异常',
                icon: 'none'
            });
            return;
        }

        if (!this.data.isConnected) {
            wx.showToast({
                title: '未连接到服务器',
                icon: 'none'
            });
            return;
        }

        // 发送到服务器
        app.globalMethods.sendText(message);
        
        // 清空输入框
        this.setData({ inputValue: '' });
    },

    // 中止语音
    abortSpeaking: function () {
        app.globalMethods.abortSpeaking();
    },

    // 滚动到底部
    scrollToBottom: function () {
        this.setData({
            scrollTop: 999999
        });
    },

    // 清空聊天记录
    clearChat: function () {
        wx.showModal({
            title: '确认清空',
            content: '确定要清空所有聊天记录吗？',
            success: (res) => {
                if (res.confirm) {
                    app.globalData.chatMessages = [];
                    this.setData({
                        chatMessages: []
                    });
                    wx.setStorageSync('chat_messages', []);
                    wx.showToast({
                        title: '已清空',
                        icon: 'success'
                    });
                }
            }
        });
    },

    // 复制消息
    copyMessage: function (e) {
        const message = e.currentTarget.dataset.message;
        wx.setClipboardData({
            data: message,
            success: () => {
                wx.showToast({
                    title: '已复制',
                    icon: 'success'
                });
            }
        });
    },

    // 分享聊天
    shareChat: function () {
        const messages = this.data.chatMessages;
        if (messages.length === 0) {
            wx.showToast({
                title: '暂无聊天记录',
                icon: 'none'
            });
            return;
        }

        // 生成聊天记录文本
        let chatText = '小智AI聊天记录\n\n';
        messages.forEach(msg => {
            const role = msg.role === 'user' ? '用户' : '小智';
            chatText += `${role}: ${msg.message}\n\n`;
        });

        wx.setClipboardData({
            data: chatText,
            success: () => {
                wx.showModal({
                    title: '分享成功',
                    content: '聊天记录已复制到剪贴板',
                    showCancel: false
                });
            }
        });
    },

    // 表情符号映射
    getEmotionEmoji: function (emotion) {
        const emotionMap = {
            'neutral': '😐',
            'happy': '😊',
            'sad': '😢',
            'angry': '😠',
            'surprised': '😲',
            'confused': '😕',
            'thinking': '🤔',
            'cool': '😎',
            'laughing': '😂',
            'winking': '😉',
            'kissy': '😘',
            'loving': '🥰',
            'relaxed': '😌',
            'sleepy': '😴',
            'shocked': '😱',
            'delicious': '😋',
            'embarrassed': '😳',
            'confident': '😏',
            'silly': '🤪'
        };
        return emotionMap[emotion] || '😐';
    },

    // 获取设备状态文本
    getDeviceStatusText: function (state) {
        const statusMap = {
            'idle': '待命',
            'connecting': '连接中...',
            'listening': '聆听中...',
            'speaking': '说话中...'
        };
        return statusMap[state] || state;
    },

    // 获取设备状态颜色
    getDeviceStatusColor: function (state) {
        const colorMap = {
            'idle': '#666666',
            'connecting': '#ff9500',
            'listening': '#07c160',
            'speaking': '#2b85e4'
        };
        return colorMap[state] || '#666666';
    },

    // 返回首页
    navigateToHome: function () {
        wx.switchTab({
            url: '/pages/index/index'
        });
    },

    // 格式化时间
    formatTime: function (timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        
        // 如果是今天的消息，只显示时间
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 如果是昨天的消息，显示"昨天"
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 其他情况显示日期和时间
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    },

    // 初始化API服务
    initApiService: function () {
        try {
            // 设置连接状态变化回调
            apiService.setConnectionStateChangedCallback(this.onConnectionStateChanged.bind(this));
            
            // 设置LLM消息回调
            apiService.on('llmContent', this.onLLMContent.bind(this));
            apiService.on('llmStart', this.onLLMStart.bind(this));
            apiService.on('llmStop', this.onLLMStop.bind(this));
            
            // 设置TTS消息回调
            apiService.on('ttsStart', this.onTTSStart.bind(this));
            apiService.on('ttsStop', this.onTTSStop.bind(this));
            apiService.on('ttsSentenceStart', this.onTTSSentenceStart.bind(this));
            
            // 设置表情消息回调
            apiService.on('emotion', this.onEmotionChanged.bind(this));
            
            // 设置错误消息回调
            apiService.on('messageError', this.onMessageError.bind(this));
            
            // 初始化API服务
            apiService.init();
        } catch (error) {
            console.error('初始化API服务失败:', error);
            wx.showToast({
                title: '服务初始化失败',
                icon: 'none',
                duration: 2000
            });
        }
    },

    // 连接状态变化处理
    onConnectionStateChanged: function (data) {
        console.log('连接状态变化:', data);
        this.setData({
            isConnected: data.connected
        });
        
        // 更新全局连接状态
        app.globalData.isConnected = data.connected;
        
        // 显示连接状态提示
        if (data.connected) {
            wx.showToast({
                title: '已连接',
                icon: 'success',
                duration: 1000
            });
        } else {
            wx.showToast({
                title: '连接断开',
                icon: 'none',
                duration: 2000
            });
        }
    },

    // LLM内容处理
    onLLMContent: function (data) {
        console.log('收到LLM内容:', data);
        
        const messages = this.data.chatMessages;
        const lastMessage = messages[messages.length - 1];
        
        // 如果最后一条消息不是AI消息，创建新的AI消息
        if (!lastMessage || lastMessage.role !== 'assistant') {
            messages.push({
                role: 'assistant',
                message: '',
                timestamp: Date.now()
            });
        }
        
        // 更新最后一条AI消息的内容
        const aiMessageIndex = messages.length - 1;
        messages[aiMessageIndex].message += data.content || '';
        
        this.setData({
            chatMessages: messages,
            toView: `msg-${aiMessageIndex}`,
            isTyping: true
        });
        
        // 清除之前的打字计时器
        if (this.data.typingTimer) {
            clearTimeout(this.data.typingTimer);
        }
        
        // 设置新的打字计时器
        this.data.typingTimer = setTimeout(() => {
            this.setData({ isTyping: false });
        }, 1000);
        
        this.scrollToBottom();
    },

    // LLM开始处理
    onLLMStart: function (data) {
        console.log('LLM开始处理:', data);
        this.setData({ loading: true });
    },

    // LLM停止处理
    onLLMStop: function (data) {
        console.log('LLM停止处理:', data);
        this.setData({
            loading: false,
            isTyping: false
        });
        
        // 清除打字计时器
        if (this.data.typingTimer) {
            clearTimeout(this.data.typingTimer);
            this.data.typingTimer = null;
        }
    },

    // TTS开始处理
    onTTSStart: function (data) {
        console.log('TTS开始:', data);
        this.setData({ deviceState: 'speaking' });
        app.globalData.deviceState = 'speaking';
    },

    // TTS停止处理
    onTTSStop: function (data) {
        console.log('TTS停止:', data);
        this.setData({ deviceState: 'idle' });
        app.globalData.deviceState = 'idle';
    },

    // TTS句子开始处理
    onTTSSentenceStart: function (data) {
        console.log('TTS句子开始:', data);
        // 可以在这里处理句子级别的语音合成
    },

    // 表情变化处理
    onEmotionChanged: function (data) {
        console.log('表情变化:', data);
        const emotion = data.emotion || 'neutral';
        this.setData({ emotion: emotion });
        app.globalData.emotion = emotion;
    },

    // 消息错误处理
    onMessageError: function (error) {
        console.error('消息处理错误:', error);
        wx.showToast({
            title: '消息处理错误',
            icon: 'none',
            duration: 2000
        });
    },

    // 发送文本消息
    sendText: function (text) {
        if (!text || !text.trim()) {
            return;
        }

        // 添加用户消息到聊天记录
        const messages = this.data.chatMessages;
        messages.push({
            role: 'user',
            message: text,
            timestamp: Date.now()
        });
        
        this.setData({
            chatMessages: messages,
            toView: `msg-${messages.length - 1}`,
            inputValue: ''
        });
        
        this.scrollToBottom();
        
        // 保存到本地存储
        wx.setStorageSync('chat_messages', messages);
        
        // 发送到服务器
        try {
            apiService.sendText(text);
        } catch (error) {
            console.error('发送文本失败:', error);
            wx.showToast({
                title: '发送失败',
                icon: 'none',
                duration: 2000
            });
        }
    },

    // 中止语音
    abortSpeaking: function () {
        try {
            apiService.sendAbortSpeaking('user_interrupted');
        } catch (error) {
            console.error('中止语音失败:', error);
        }
    }
});