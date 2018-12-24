const app = getApp()
const backgroundAudioManager = wx.getBackgroundAudioManager() //全局播放实例
const Lyric = require('../../util/lyric.js')
Page({
  data: {
    dataList: [], //数据list
    keyword: "", //关键词，接口参数
    page: 1, //当前页数，接口参数
    playing: -1,
    swiperHeight: 0,
    searchScrollHeight: 0,
    lyricScrollHeight: 0,
    //-1未初始化,或播放完
    //0暂停
    //1播放

    currentLyric: null,
    currentLineNum: 0,
    toLineNum: -1,

    currentMusic: {
      mid: "",
      title: "",
      epname: "",
      singer: "",
      url: "",
      coverImgUrl: "../../image/bg.png",
      duration: ""
    },
  },
  onLoad: function() {
    this.computeSwiperHeight();
    this.computeSearchScrollHeight();
    this.computeLyricScrollHeight();
    this.getStoreInfo();
    this.initBackgroundAudioManager();
    this.getLyric(this.data.currentMusic.mid);
  },

  initBackgroundAudioManager: function() {
    //监听音乐播放开始
    backgroundAudioManager.onPlay(() => {
      this.setData({
        // 更新当前music
        playing: 1,
        'currentMusic.duration': backgroundAudioManager.duration
      });
    });
    backgroundAudioManager.onPause(() => {
      this.setData({
        // 更新当前music
        playing: 0,
      });
    });
    //监听音乐播放结束
    backgroundAudioManager.onEnded(() => {
      this.setData({
        // 更新当前music
        playing: -1,
      });
    });
    //监听音乐播放错误
    backgroundAudioManager.onError(() => {
      this.setData({
        // 更新当前music
        playing: -1,
      });
      wx.showToast({
        title: '失败',
        icon: 'none',
        duration: 1000,
        mask: true
      })
    });
    //监听音乐播放停止
    backgroundAudioManager.onStop(() => {
      this.setData({
        // 更新当前music
        playing: -1,
      });
    });
    //监听音乐播放进度
    backgroundAudioManager.onTimeUpdate(() => {
      const currentTime = backgroundAudioManager.currentTime
      this.setData({
        currentTime: this.formatTime(currentTime),
        percent: currentTime / this.data.currentMusic.duration
      })
      if (this.data.currentLyric) {
        this.handleLyric(currentTime * 1000)
      }
    })
  },

  getStoreInfo: function() {
    // 查询缓存数据
    try {
      const music = wx.getStorageSync('music')
      if (music) {
        this.setData({
          // 更新当前music
          currentMusic: music
        });
      }
    } catch (e) {}
  },

  computeSwiperHeight: function() {
    let that = this
    let query = wx.createSelectorQuery().in(this)
    query.select('.controler_music').boundingClientRect()
    query.exec(res => {
      let controlerHeight = res[0].height
      let windowHeight = wx.getSystemInfoSync().windowHeight
      let swiperHeight = windowHeight - controlerHeight
      this.setData({
        swiperHeight: swiperHeight
      })
    })
  },

  computeSearchScrollHeight: function() {
    //计算scrollheight
    let that = this
    let query = wx.createSelectorQuery().in(this)
    query.select('.search_box').boundingClientRect()
    query.exec(res => {
      let searchHeight = res[0].height
      let scrollHeight = this.data.swiperHeight - searchHeight
      this.setData({
        searchScrollHeight: scrollHeight
      })
    })
  },

  computeLyricScrollHeight: function() {
    //计算scrollheight
    let that = this
    let query = wx.createSelectorQuery().in(this)
    query.select('.search_box').boundingClientRect()
    query.exec(res => {
      let searchHeight = res[0].height
      let windowHeight = wx.getSystemInfoSync().windowHeight
      let scrollHeight = windowHeight - 2 * searchHeight
      this.setData({
        lyricScrollHeight: scrollHeight
      })
    })
  },
  // 绑定input
  getKeyWord: function(event) {
    this.setData({
      keyword: event.detail.value
    });
  },

  clickSearch: function() {
    this.setData({
      dataList: [], //清空
      page: 1 //重置页数
    });
    this.searchMusic();
  },

  // 搜索音乐
  searchMusic: function() {
    var that = this;
    wx.request({
      data: {
        keyword: that.data.keyword,
        page: that.data.page,
      },
      url: "http://118.24.85.15:8090/api/search.php",
      method: 'GET',
      success: function(res) {
        var list = that.data.dataList;
        for (var i = 0; i < res.data.data.song.list.length; i++) {
          list.push(res.data.data.song.list[i]);
        }
        that.setData({
          dataList: list,
        });
        that.data.page++;
        // console.log(that.data.dataList);
      },
      fail: function() {
        wx.showToast({
          title: '失败',
          icon: 'none',
          duration: 1000,
          mask: true
        })
      },
      complete: function() {}
    })
  },

  // 获取音乐
  getMusic: function(e) {
    var music = e.currentTarget.dataset.music
    this.getRealUrl(music)
  },

  // 获取真实地址
  getRealUrl: function(music) {
    var that = this;
    wx.request({
      data: {
        songsMid: music.ksong.mid,
        mediaMid: music.mid,
        musicType: "mp3_128k"
      },
      url: "http://118.24.85.15:8090/api/getRealUrl.php",
      method: 'GET',
      success: function(res) {
        if (res.data.mp3_128k != "") {
          // console.log(res.data.mp3_128k);
          that.setData({
            // 保存当前music
            'currentMusic.mid': music.id,
            'currentMusic.title': music.name,
            'currentMusic.singer': music.singer[0].name,
            'currentMusic.epname': music.album.title,
            'currentMusic.url': res.data.mp3_128k,
            'currentMusic.coverImgUrl': 'https://y.gtimg.cn/music/photo_new/T002R300x300M000' + music.album.mid + '.jpg?max_age=2592000',
          });
          that.initMusic();
        }
      },
      fail: function() {
        wx.showToast({
          title: '失败',
          icon: 'none',
          duration: 1000,
          mask: true
        })
      },
      complete: function() {}
    })
  },
  // 获取歌词
  getLyric: function(mid) {
    var that = this;
    wx.request({
      data: {
        songsMid: mid,
      },
      url: "http://118.24.85.15:8090/api/getLyric.php",
      method: 'GET',
      success: function(res) {
        // console.log(res.data.lyric)
        const lyric = that.normalizeLyric(res.data.lyric)
        // console.log(lyric)
        const currentLyric = new Lyric(lyric)
        that.setData({
          currentLyric: currentLyric
        })
      },
      fail: function() {},
      complete: function() {}
    })
  },
  // 去掉歌词中的转义字符
  normalizeLyric: function(lyric) {
    return lyric.replace(/&#58;/g, ':').replace(/&#10;/g, '\n').replace(/&#46;/g, '.').replace(/&#32;/g, ' ').replace(/&#45;/g, '-').replace(/&#40;/g, '(').replace(/&#41;/g, ')')
  },
  // 歌词滚动回调函数
  handleLyric: function(currentTime) {
    let lines = [{
        time: 0,
        txt: ''
      }],
      lyric = this.data.currentLyric,
      lineNum
    lines = lines.concat(lyric.lines)
    for (let i = 0; i < lines.length; i++) {
      if (i < lines.length - 1) {
        let time1 = lines[i].time,
          time2 = lines[i + 1].time
        if (currentTime > time1 && currentTime < time2) {
          lineNum = i - 1
          break;
        }
      } else {
        lineNum = lines.length - 2
      }
    }
    this.setData({
      currentLineNum: lineNum,
      currentText: lines[lineNum + 1] && lines[lineNum + 1].txt
    })

    let toLineNum = lineNum - 7
    if (lineNum > 7 && toLineNum != this.data.toLineNum) {
      this.setData({
        toLineNum: toLineNum
      })
    }
  },
  formatTime: function(interval) {
    interval = interval | 0
    const minute = interval / 60 | 0
    const second = this.pad(interval % 60)
    return `${minute}:${second}`
  },
  /*秒前边加0*/
  pad(num, n = 2) {
    let len = num.toString().length
    while (len < n) {
      num = '0' + num
      len++
    }
    return num
  },
  // 初始化音乐
  initMusic: function() {
    backgroundAudioManager.title = this.data.currentMusic.title;
    backgroundAudioManager.epname = this.data.currentMusic.epname;
    backgroundAudioManager.singer = this.data.currentMusic.singer;
    backgroundAudioManager.coverImgUrl = this.data.currentMusic.coverImgUrl;
    backgroundAudioManager.src = this.data.currentMusic.url;
    //  缓存数据
    try {
      wx.setStorageSync('music', this.data.currentMusic)
    } catch (e) {}
    this.getLyric(this.data.currentMusic.mid);
  },
  // 控制音乐
  musicControler: function() {
    if (this.data.playing == 1) {
      this.setData({
        playing: 0,
      });
      backgroundAudioManager.pause();
    } else if (this.data.playing == 0) {
      this.setData({
        playing: 1,
      });
      backgroundAudioManager.play();
    } else if (this.data.playing == -1) {
      this.initMusic();
    }
  },

  // "enablePullDownRefresh": true,
  //自适应的list有坑，无法设置高度，所以使用scrollview
  // 页面上拉触底事件的处理函数，上拉加载
  // onReachBottom: function() {
  //   this.searchMusic();
  // },
  // onPullDownRefresh: function() {
  //   this.clickSearch();
  // }
})