export default defineAppConfig({
  pages: [
    'pages/index/index',          // 首页
    'pages/eggPredict/index',     // 神秘蛋鉴定
    'pages/eggAppraisal/index',   // 基因鉴定
    'pages/garden/index'          // <--- 把家园查询加在这里！
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  }
})