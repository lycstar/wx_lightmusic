const app = getApp()
const backgroundAudioManager = wx.getBackgroundAudioManager() //全局播放实例
Page({
  data: {
    dataList: [], //数据list
    keyword: "", //关键词，接口参数
    page: 1, //当前页数，接口参数
    playing: -1,
    scrollHeight: 400,
    //-1未初始化,或播放完
    //0暂停
    //1播放
    currentMusic: {
      title: "",
      epname: "",
      singer: "",
      url: "",
      coverImgUrl: "../../image/ic_music.png",
    }
  },
  onLoad: function() {
    //计算scrollheight
    this.computeScrollViewHeight();
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

    //监听音乐播放开始
    backgroundAudioManager.onPlay(() => {
      this.setData({
        // 更新当前music
        playing: 1,
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
  },
  computeScrollViewHeight() {
    let that = this
    let query = wx.createSelectorQuery().in(this)
    query.select('.search_box').boundingClientRect()
    query.select('.controler_music').boundingClientRect()
    query.exec(res => {
      let searchHeight = res[0].height
      let controlerHeight = res[1].height
      let windowHeight = wx.getSystemInfoSync().windowHeight
      let scrollHeight = windowHeight - searchHeight - controlerHeight
      this.setData({
        scrollHeight: scrollHeight
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
        console.log(that.data.dataList);
      },
      fail: function() {
        wx.showToast({
          title: '失败',
          icon: 'none',
          duration: 1000,
          mask: true
        })
      },
      complete: function() {
        wx.stopPullDownRefresh(); //停止刷新
      }
    })
  },

  // 获取真实地址
  getRealUrl: function(e) {
    var music = e.currentTarget.dataset.music
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
          console.log(res.data.mp3_128k);
          that.setData({
            // 保存当前music
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
      complete: function() {
        //停止刷新
        wx.stopPullDownRefresh();
      }
    })
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