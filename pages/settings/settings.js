// pages/settings/settings.js
const app = getApp();
const config = require('../../utils/config');

Page({
    data: {
        // 配置数据
        config: {},
        efuse: {},
        // 当前标签页
        currentTab: 'config',
        // 加载状态
        loading: true,
        // 错误信息
        error: null
    },

    onLoad: function () {
        this.loadConfig();
    },

    onShow: function () {
        // 如果需要，可以在这里刷新配置
    },

    // 切换标签页
    switchTab: function (e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({
            currentTab: tab
        });
    },

    // 加载配置
    loadConfig: function () {
        this.setData({ loading: true, error: null });
        
        try {
            // 从配置模块获取配置
            const appConfig = config.getConfig();
            const appEfuse = config.getEfuse();
            
            this.setData({
                config: appConfig,
                efuse: appEfuse,
                loading: false
            });
        } catch (error) {
            console.error('加载配置失败:', error);
            this.setData({ 
                loading: false, 
                error: '加载配置失败，请重试' 
            });
        }
    },

    // 刷新配置
    refreshConfig: function () {
        wx.showLoading({ title: '刷新中...' });
        config.loadConfigFromServer().then(() => {
            this.loadConfig();
            wx.hideLoading();
            wx.showToast({
                title: '已刷新',
                icon: 'success'
            });
        }).catch((error) => {
            console.error('刷新配置失败:', error);
            wx.hideLoading();
            wx.showToast({
                title: '刷新失败',
                icon: 'none'
            });
        });
    },

    // 保存配置
    saveConfig: function () {
        try {
            // 更新配置
            config.updateConfig(this.data.config);
            config.updateEfuse(this.data.efuse);
            
            wx.showToast({
                title: '保存成功',
                icon: 'success'
            });
        } catch (error) {
            console.error('保存配置失败:', error);
            wx.showToast({
                title: '保存失败',
                icon: 'none'
            });
        }
    },

    // 重置配置
    resetConfig: function () {
        wx.showModal({
            title: '确认重置',
            content: '确定要重置所有配置吗？',
            success: (res) => {
                if (res.confirm) {
                    config.resetConfig();
                    this.loadConfig();
                }
            }
        });
    },

    // 配置项变化处理
    onConfigChange: function (e) {
        const { field, value } = e.currentTarget.dataset;
        const configData = this.data.config;
        
        if (field.includes('.')) {
            const keys = field.split('.');
            let current = configData;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
        } else {
            configData[field] = value;
        }
        
        this.setData({ config: configData });
    },

    // efuse配置项变化处理
    onEfuseChange: function (e) {
        const { field, value } = e.currentTarget.dataset;
        const efuseData = this.data.efuse;
        
        if (field.includes('.')) {
            const keys = field.split('.');
            let current = efuseData;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
        } else {
            efuseData[field] = value;
        }
        
        this.setData({ efuse: efuseData });
    },

    // 复制配置
    copyConfig: function () {
        const configText = JSON.stringify(this.data.config, null, 2);
        wx.setClipboardData({
            data: configText,
            success: () => {
                wx.showToast({
                    title: '已复制到剪贴板',
                    icon: 'success'
                });
            }
        });
    },

    // 复制efuse
    copyEfuse: function () {
        const efuseText = JSON.stringify(this.data.efuse, null, 2);
        wx.setClipboardData({
            data: efuseText,
            success: () => {
                wx.showToast({
                    title: '已复制到剪贴板',
                    icon: 'success'
                });
            }
        });
    },

    // 导出配置
    exportConfig: function () {
        const configData = {
            config: this.data.config,
            efuse: this.data.efuse,
            exportTime: new Date().toISOString()
        };
        
        const configText = JSON.stringify(configData, null, 2);
        
        wx.setClipboardData({
            data: configText,
            success: () => {
                wx.showModal({
                    title: '导出成功',
                    content: '配置已复制到剪贴板，请妥善保存',
                    showCancel: false
                });
            }
        });
    },

    // 导入配置
    importConfig: function () {
        wx.showModal({
            title: '导入配置',
            content: '请将配置内容粘贴到下方文本框',
            editable: true,
            success: (res) => {
                if (res.confirm && res.content) {
                    try {
                        const configData = JSON.parse(res.content);
                        
                        if (configData.config) {
                            this.setData({ config: configData.config });
                        }
                        
                        if (configData.efuse) {
                            this.setData({ efuse: configData.efuse });
                        }
                        
                        wx.showToast({
                            title: '导入成功',
                            icon: 'success'
                        });
                    } catch (error) {
                        console.error('导入配置失败:', error);
                        wx.showToast({
                            title: '配置格式错误',
                            icon: 'none'
                        });
                    }
                }
            }
        });
    }
});