// utils/util.js

// 格式化时间
const formatTime = date => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()

    return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

// 格式化数字
const formatNumber = n => {
    n = n.toString()
    return n[1] ? n : '0' + n
}

// 防抖函数
const debounce = (func, wait) => {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// 节流函数
const throttle = (func, limit) => {
    let inThrottle
    return function () {
        const args = arguments
        const context = this
        if (!inThrottle) {
            func.apply(context, args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}

// 深拷贝
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj.getTime())
    if (obj instanceof Array) return obj.map(item => deepClone(item))
    if (typeof obj === 'object') {
        const clonedObj = {}
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key])
            }
        }
        return clonedObj
    }
}

// 获取文件扩展名
const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

// 格式化文件大小
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 生成唯一ID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// 检查是否为空
const isEmpty = (value) => {
    if (value === null || value === undefined || value === '') return true
    if (typeof value === 'object') {
        if (Array.isArray(value)) return value.length === 0
        return Object.keys(value).length === 0
    }
    return false
}

// 本地存储封装
const storage = {
    set: (key, value) => {
        try {
            wx.setStorageSync(key, value)
            return true
        } catch (e) {
            console.error('存储失败:', e)
            return false
        }
    },

    get: (key, defaultValue = null) => {
        try {
            return wx.getStorageSync(key) || defaultValue
        } catch (e) {
            console.error('读取失败:', e)
            return defaultValue
        }
    },

    remove: (key) => {
        try {
            wx.removeStorageSync(key)
            return true
        } catch (e) {
            console.error('删除失败:', e)
            return false
        }
    },

    clear: () => {
        try {
            wx.clearStorageSync()
            return true
        } catch (e) {
            console.error('清空失败:', e)
            return false
        }
    }
}

// 网络请求封装
const request = {
    get: (url, data = {}) => {
        return new Promise((resolve, reject) => {
            wx.request({
                url,
                data,
                method: 'GET',
                success: (res) => {
                    if (res.statusCode === 200) {
                        resolve(res.data)
                    } else {
                        reject(new Error(`请求失败: ${res.statusCode}`))
                    }
                },
                fail: (err) => {
                    reject(err)
                }
            })
        })
    },

    post: (url, data = {}) => {
        return new Promise((resolve, reject) => {
            wx.request({
                url,
                data,
                method: 'POST',
                success: (res) => {
                    if (res.statusCode === 200) {
                        resolve(res.data)
                    } else {
                        reject(new Error(`请求失败: ${res.statusCode}`))
                    }
                },
                fail: (err) => {
                    reject(err)
                }
            })
        })
    }
}

// 音频处理工具
const audioUtils = {
    // 开始录音
    startRecord: () => {
        return new Promise((resolve, reject) => {
            const recorderManager = wx.getRecorderManager()

            recorderManager.onStart(() => {
                resolve()
            })

            recorderManager.onError((err) => {
                reject(err)
            })

            recorderManager.start({
                duration: 60000,
                sampleRate: 16000,
                numberOfChannels: 1,
                encodeBitRate: 96000,
                format: 'mp3'
            })
        })
    },

    // 停止录音
    stopRecord: () => {
        return new Promise((resolve, reject) => {
            const recorderManager = wx.getRecorderManager()

            recorderManager.onStop((res) => {
                resolve(res.tempFilePath)
            })

            recorderManager.onError((err) => {
                reject(err)
            })

            recorderManager.stop()
        })
    },

    // 播放音频
    playAudio: (src) => {
        return new Promise((resolve, reject) => {
            const audioContext = wx.createAudioContext('audioPlayer')

            audioContext.setSrc(src)
            audioContext.play()

            audioContext.onEnded(() => {
                resolve()
            })

            audioContext.onError((err) => {
                reject(err)
            })
        })
    }
}

// 设备信息
const deviceInfo = {
    // 获取系统信息
    getSystemInfo: () => {
        return new Promise((resolve) => {
            wx.getSystemInfo({
                success: (res) => {
                    resolve(res)
                }
            })
        })
    },

    // 获取网络状态
    getNetworkType: () => {
        return new Promise((resolve) => {
            wx.getNetworkType({
                success: (res) => {
                    resolve(res.networkType)
                }
            })
        })
    },

    // 检查网络连接
    checkNetwork: () => {
        return new Promise((resolve) => {
            wx.getNetworkType({
                success: (res) => {
                    resolve(res.networkType !== 'none')
                }
            })
        })
    }
}

// 权限检查
const permission = {
    // 检查录音权限
    checkRecordPermission: () => {
        return new Promise((resolve) => {
            wx.getSetting({
                success: (res) => {
                    resolve(res.authSetting['scope.record'] === true)
                }
            })
        })
    },

    // 请求录音权限
    requestRecordPermission: () => {
        return new Promise((resolve, reject) => {
            wx.authorize({
                scope: 'scope.record',
                success: () => {
                    resolve(true)
                },
                fail: (err) => {
                    reject(err)
                }
            })
        })
    }
}

// 导出工具函数
module.exports = {
    formatTime,
    formatNumber,
    debounce,
    throttle,
    deepClone,
    getFileExtension,
    formatFileSize,
    generateUUID,
    isEmpty,
    storage,
    request,
    audioUtils,
    deviceInfo,
    permission
}