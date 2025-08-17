// pages/tools/tools.js
const app = getApp();

Page({
    data: {
        tools: [
            {
                id: 'calendar',
                name: '日程管理',
                icon: '📅',
                desc: '创建和管理日程安排',
                category: 'productivity',
                enabled: true
            },
            {
                id: 'music',
                name: '音乐播放',
                icon: '🎵',
                desc: '在线音乐搜索播放',
                category: 'entertainment',
                enabled: true
            },
            {
                id: 'map',
                name: '地图导航',
                icon: '🗺️',
                desc: '路径规划和周边搜索',
                category: 'navigation',
                enabled: true
            },
            {
                id: 'search',
                name: '智能搜索',
                icon: '🔍',
                desc: '网络搜索和内容获取',
                category: 'information',
                enabled: true
            },
            {
                id: 'recipe',
                name: '菜谱查询',
                icon: '🍳',
                desc: '丰富菜谱库和智能推荐',
                category: 'lifestyle',
                enabled: true
            },
            {
                id: 'timer',
                name: '定时器',
                icon: '⏰',
                desc: '倒计时和定时提醒',
                category: 'productivity',
                enabled: true
            },
            {
                id: 'camera',
                name: '图像识别',
                icon: '📷',
                desc: '拍照识别和智能分析',
                category: 'ai',
                enabled: false
            },
            {
                id: 'bazi',
                name: '八字命理',
                icon: '🔮',
                desc: '传统八字命理分析',
                category: 'lifestyle',
                enabled: true
            },
            {
                id: 'railway',
                name: '12306查询',
                icon: '🚄',
                desc: '铁路票务查询服务',
                category: 'transport',
                enabled: true
            }
        ],
        categories: [
            { id: 'all', name: '全部' },
            { id: 'productivity', name: '效率工具' },
            { id: 'entertainment', name: '娱乐' },
            { id: 'navigation', name: '出行' },
            { id: 'information', name: '信息' },
            { id: 'lifestyle', name: '生活' },
            { id: 'ai', name: 'AI工具' },
            { id: 'transport', name: '交通' }
        ],
        currentCategory: 'all',
        searchQuery: '',
        filteredTools: [],
        loading: false,
        hasDisabledTools: false
    },

    onLoad: function () {
        this.setData({
            filteredTools: this.data.tools
        });
    },

    onShow: function () {
        // 可以在这里加载工具的最新状态
        this.loadToolStatus();
    },

    // 加载工具状态
    loadToolStatus: function () {
        // 从本地存储或服务器加载工具的启用状态
        const toolStatus = wx.getStorageSync('tool_status') || {};
        const tools = this.data.tools.map(tool => ({
            ...tool,
            enabled: toolStatus[tool.id] !== false
        }));

        this.setData({ tools });
        this.filterTools();
    },

    // 切换分类
    switchCategory: function (e) {
        const category = e.currentTarget.dataset.category;
        this.setData({
            currentCategory: category,
            searchQuery: ''
        });
        this.filterTools();
    },

    // 搜索工具
    onSearch: function (e) {
        const query = e.detail.value.toLowerCase();
        this.setData({
            searchQuery: query
        });
        this.filterTools();
    },

    // 过滤工具
    filterTools: function () {
        let filtered = this.data.tools;

        // 按分类过滤
        if (this.data.currentCategory !== 'all') {
            filtered = filtered.filter(tool => tool.category === this.data.currentCategory);
        }

        // 按搜索词过滤
        if (this.data.searchQuery) {
            filtered = filtered.filter(tool =>
                tool.name.toLowerCase().includes(this.data.searchQuery) ||
                tool.desc.toLowerCase().includes(this.data.searchQuery)
            );
        }

        // 检查是否有禁用的工具
        const hasDisabled = filtered.some(tool => !tool.enabled);

        this.setData({
            filteredTools: filtered,
            hasDisabledTools: hasDisabled
        });
    },

    // 检查是否有禁用的工具
    hasDisabledTools: function () {
        return this.data.hasDisabledTools;
    },

    // 切换工具启用状态
    toggleTool: function (e) {
        const { toolId } = e.currentTarget.dataset;
        const tools = this.data.tools.map(tool => {
            if (tool.id === toolId) {
                const newEnabled = !tool.enabled;
                // 保存到本地存储
                const toolStatus = wx.getStorageSync('tool_status') || {};
                toolStatus[toolId] = newEnabled;
                wx.setStorageSync('tool_status', toolStatus);
                return { ...tool, enabled: newEnabled };
            }
            return tool;
        });

        this.setData({ tools });
        this.filterTools();
    },

    // 打开工具
    openTool: function (e) {
        const { toolId } = e.currentTarget.dataset;
        const tool = this.data.tools.find(t => t.id === toolId);

        if (!tool || !tool.enabled) {
            wx.showToast({
                title: '工具未启用',
                icon: 'none'
            });
            return;
        }

        // 根据工具ID执行不同的操作
        this.executeTool(tool);
    },

    // 执行工具
    executeTool: function (tool) {
        switch (tool.id) {
            case 'calendar':
                this.openCalendar();
                break;
            case 'music':
                this.openMusic();
                break;
            case 'map':
                this.openMap();
                break;
            case 'search':
                this.openSearch();
                break;
            case 'recipe':
                this.openRecipe();
                break;
            case 'timer':
                this.openTimer();
                break;
            case 'camera':
                this.openCamera();
                break;
            case 'bazi':
                this.openBazi();
                break;
            case 'railway':
                this.openRailway();
                break;
            default:
                wx.showToast({
                    title: '功能开发中',
                    icon: 'none'
                });
        }
    },

    // 打开日程管理
    openCalendar: function () {
        wx.showToast({
            title: '打开日程管理',
            icon: 'none'
        });
    },

    // 打开音乐播放
    openMusic: function () {
        wx.showToast({
            title: '打开音乐播放',
            icon: 'none'
        });
    },

    // 打开地图导航
    openMap: function () {
        wx.showToast({
            title: '打开地图导航',
            icon: 'none'
        });
    },

    // 打开智能搜索
    openSearch: function () {
        wx.showToast({
            title: '打开智能搜索',
            icon: 'none'
        });
    },

    // 打开菜谱查询
    openRecipe: function () {
        wx.showToast({
            title: '打开菜谱查询',
            icon: 'none'
        });
    },

    // 打开定时器
    openTimer: function () {
        wx.showToast({
            title: '打开定时器',
            icon: 'none'
        });
    },

    // 打开图像识别
    openCamera: function () {
        wx.showToast({
            title: '打开图像识别',
            icon: 'none'
        });
    },

    // 打开八字命理
    openBazi: function () {
        wx.showToast({
            title: '打开八字命理',
            icon: 'none'
        });
    },

    // 打开12306查询
    openRailway: function () {
        wx.showToast({
            title: '打开12306查询',
            icon: 'none'
        });
    },

    // 分享页面
    onShareAppMessage: function () {
        return {
            title: '小智AI - 实用工具集合',
            path: '/pages/tools/tools',
            imageUrl: '/images/share.png'
        };
    }
});