import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import './index.scss'

const DEFAULT_ICON = 'https://env-00jxhb62nv6n.normal.cloudstatic.cn/100884_1776907074205_0.png'
const ALL_POSSIBLE_ITEMS = [
  { name: '炫彩蛋', icon: DEFAULT_ICON },
  { name: '棱镜球', icon: DEFAULT_ICON },
  { name: '祝福项坠', icon: DEFAULT_ICON },
  { name: '黑白炫彩蛋', icon: DEFAULT_ICON },
  { name: '赛季炫彩蛋', icon: DEFAULT_ICON },
  { name: '国王球', icon: 'https://mmbiz.qpic.cn/sz_mmbiz_png/dhh0GGnuf9u5I6YSdnLf1ibyiaPkWxNfsVlic2Qdff3ooKTFWDA3xbBJXABzjeStbKDCTibC2P5kuCFMchdwogb1Iw/640?wx_fmt=png' },
  { name: '神奇的蛋', icon: DEFAULT_ICON },
  { name: '首领血脉秘药', icon: DEFAULT_ICON },
  { name: '奇异血脉秘药', icon: DEFAULT_ICON }
]
const ITEMS_PER_PAGE = 6

export default function Index() {
  const [merchantData, setMerchantData] = useState<any>(null)
  const [subCount, setSubCount] = useState<number>(() => Taro.getStorageSync('subCount') || 0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>(() => Taro.getStorageSync('userSelectedItems') || ['炫彩蛋', '棱镜球'])
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(ALL_POSSIBLE_ITEMS.length / ITEMS_PER_PAGE)
  const currentList = ALL_POSSIBLE_ITEMS.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  useEffect(() => { fetchMerchantData() }, [])
  useEffect(() => { Taro.setStorageSync('userSelectedItems', selectedItems) }, [selectedItems])

  const fetchMerchantData = () => {
    Taro.request({
      url: 'http://47.109.57.230:15200/api/merchant/current',
      method: 'GET',
      success: (res) => { if (res.data.code === 200) setMerchantData(res.data.data) }
    })
  }

  const toggleItem = (itemName: string) => {
    if (selectedItems.includes(itemName)) setSelectedItems(selectedItems.filter(i => i !== itemName))
    else setSelectedItems([...selectedItems, itemName])
  }

  const selectAll = () => {
    if (selectedItems.length === ALL_POSSIBLE_ITEMS.length) setSelectedItems([])
    else setSelectedItems(ALL_POSSIBLE_ITEMS.map(item => item.name))
  }

  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(p => p - 1) }
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1) }

  const handleSubscribe = () => {
    if (!selectedItems.length) return Taro.showToast({ title: '请先选择通知商品', icon: 'none' })
    const tmplId = 'T1RoJnGhYZSZoXWVgMFz9-uFYY4pdFGK6-3P7KSNJv0'
    Taro.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: (res) => {
        if (res[tmplId] === 'accept') {
          Taro.login({
            success: (loginRes) => {
              if (loginRes.code) {
                Taro.request({
                  url: 'http://47.109.57.230:15200/api/subscribe', method: 'POST',
                  data: { code: loginRes.code, target_items: selectedItems },
                  success: (subRes) => {
                    if (subRes.data.code === 200) {
                      Taro.showToast({ title: '订阅成功！', icon: 'success' })
                      setSubCount(subRes.data.count); Taro.setStorageSync('subCount', subRes.data.count)
                    }
                  }
                })
              }
            }
          })
        }
      }
    })
  }

  const navigateTo = (url: string) => {
    if (!url) return
    Taro.navigateTo({ url })
  }

  const commonFuncs = [
    { name: '家园查询', path: '/pages/garden/index', icon: 'https://imgpub.hhhhhy.kim/34/dimo.png' },
    { name: '努力值', path: '/pages/effort/index', icon: 'https://imgpub.hhhhhy.kim/34/puto.png' },
    { name: '性格推荐', path: '/pages/natureRecommend/index', icon: 'https://imgpub.hhhhhy.kim/34/puto.png' },
    { name: '属性相克', path: '/pages/restrainCalc/index', icon: 'https://imgpub.hhhhhy.kim/34/puto.png' }
  ]
  const pvpFuncs = [
    { name: '阵容搭配', path: '/pages/teambuilder/index', icon: 'https://imgpub.hhhhhy.kim/34/dimo.png' },
    { name: '热门队伍', path: '/pages/hotTeam/index', icon: 'https://imgpub.hhhhhy.kim/34/dimo.png' },
    { name: '伤害计算器', path: '/pages/pvpComputer/index', icon: 'https://imgpub.hhhhhy.kim/34/dimo.png' },
    { name: '速度线', path: '/pages/speedRank/index', icon: 'https://imgpub.hhhhhy.kim/34/dimo.png' }
  ]
  // 变更点1：将“基因鉴定”移动到图鉴功能区，并配上棱镜球图标
  const dexFuncs = [
    { name: '宠物图鉴', path: '/pages/pokedex/index', icon: 'https://imgpub.hhhhhy.kim/34/xuancai.png' },
    { name: '性格图鉴', path: '/pages/nature/index', icon: 'https://imgpub.hhhhhy.kim/34/xuancai.png' },
    { name: '遗传蛋组', path: '/pages/eggGroups/index', icon: 'https://imgpub.hhhhhy.kim/34/xuancai.png' },
    { name: '道具图鉴', path: '/pages/items/index', icon: 'https://imgpub.hhhhhy.kim/34/xuancai.png' },
    { name: '基因鉴定', path: '/pages/eggAppraisal/index', icon: 'https://imgpub.hhhhhy.kim/34/lengji.png' } 
  ]
  const otherFuncs = [
    { name: '闪光记录', path: '/pages/shinyRecord/index', icon: 'https://imgpub.hhhhhy.kim/34/yuanxingshangre.png' },
    { name: '收集进度', path: '/pages/collection/index', icon: 'https://imgpub.hhhhhy.kim/34/yuanxingshangre.png' },
    { name: '更新日志', path: '/pages/changelog/index', icon: 'https://imgpub.hhhhhy.kim/34/yuanxingshangre.png' },
    { name: '关于我们', path: '/pages/about/index', icon: 'https://imgpub.hhhhhy.kim/34/yuanxingshangre.png' }
  ]

  return (
    <View className="min-h-screen bg-[#f3f7ea] p-4 font-sans relative pb-10 box-border">
      
      {/* ================= 1. 远行商人板块 ================= */}
      <View className="bg-[#fcfdf8] rounded-[24px] p-4 shadow-sm border border-[#e8ecd8] mb-4">
        <View className="flex justify-between items-center mb-3 px-1">
          <View className="flex items-center">
            <View className="w-1.5 h-4 bg-[#a1c97a] rounded-full mr-2" />
            <Text className="text-[16px] font-extrabold text-[#3a542d]">远行商人</Text>
          </View>
          <Text className="text-[11px] text-[#869677] font-medium">每半小时出现10分钟</Text>
        </View>

        <View className="relative w-full overflow-hidden rounded-[16px] shadow-sm mb-4" style={{ height: '140px' }}>
          <Image src="https://imgpub.hhhhhy.kim/34/yuanxin.jpg" mode="aspectFill" style={{ width: '100%', height: '100%' }} />
          <View className="absolute bottom-2 right-2 flex items-center space-x-2">
            <View className="rounded-md bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm font-bold">
              {merchantData?.round_text || '获取中...'}
            </View>
            <View className="rounded-md bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm font-bold">
              {merchantData?.time_text || '--:--'}
            </View>
          </View>
        </View>

        <View className="flex justify-between space-x-3 mb-4">
          <View onClick={() => setIsModalOpen(true)} className="flex-1 bg-[#f4f7eb] border border-[#dcebc4] text-[#5e7a45] text-[13px] font-bold py-2.5 rounded-xl text-center active:scale-95 transition-all">
            选择通知商品
          </View>
          <View onClick={handleSubscribe} className="flex-1 bg-[#a1c97a] text-white text-[13px] font-bold py-2.5 rounded-xl text-center active:scale-95 transition-all shadow-sm">
            订阅提醒 (剩{subCount}次)
          </View>
        </View>

        <View className="border-t border-[#edf2e1] pt-3">
          <Text className="text-[#5e7a45] font-extrabold text-[14px] mb-3 block px-1">本场带来的商品</Text>
          <ScrollView scrollX className="w-full whitespace-nowrap hide-scrollbar">
            {merchantData?.items?.map((item: any, idx: number) => (
              <View key={idx} className="inline-flex flex-col items-center justify-start mr-3 align-top" style={{ width: '64px' }}>
                <View className="bg-[#f4f7eb] border border-[#e4ebd3] rounded-[16px] flex items-center justify-center shadow-sm" style={{ width: '64px', height: '64px', minHeight: '64px', maxHeight: '64px' }}>
                  <Image src={item.icon_url?.replace('http://', 'https://')} mode="aspectFit" style={{ width: '40px', height: '40px' }} />
                </View>
                <View className="mt-2 w-full">
                  <Text className="block truncate text-[12px] font-bold text-[#3a542d] text-center w-full">{item.name}</Text>
                </View>
              </View>
            ))}
            {(!merchantData?.items || merchantData.items.length === 0) && (
              <Text className="text-[12px] text-[#869677] text-center w-full block py-4">本轮暂无商品数据</Text>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ================= 2. 核心板块：神秘蛋鉴定 (变更为原版横幅排版) ================= */}
      <View className="bg-[#fcfdf8] rounded-[24px] p-5 shadow-sm border border-[#e8ecd8] mb-4">
        <View className="flex items-center mb-4 px-1">
          <View className="w-1.5 h-4 bg-[#a1c97a] rounded-full mr-2" />
          <Text className="text-[17px] font-extrabold text-[#3a542d]">神秘蛋鉴定</Text>
        </View>
        
        <View 
          className="relative w-full overflow-hidden rounded-[20px] bg-gradient-to-r from-[#eef5e3] to-[#f4f7eb] p-4 flex items-center justify-between border border-[#e4ebd3] active:scale-95 transition-all shadow-sm cursor-pointer"
          onClick={() => navigateTo('/pages/eggPredict/index')}
        >
          <View className="flex items-center z-10">
            <View className="w-[50px] h-[50px] bg-white rounded-[16px] flex items-center justify-center shadow-sm border border-[#edf2e1] mr-3 shrink-0">
              <Image src="https://imgpub.hhhhhy.kim/34/lengji.png" mode="aspectFit" style={{ width: '34px', height: '34px' }} />
            </View>
            <View className="flex flex-col">
              <Text className="text-[16px] font-extrabold text-[#3a542d] mb-1 tracking-wide">神秘蛋外观预测</Text>
              <Text className="text-[#718c54] text-[11px] font-bold">输入身高与体重，快速推算孵化结果</Text>
            </View>
          </View>
          
          <View className="bg-[#a1c97a] px-3 py-1.5 rounded-full z-10 shadow-sm flex items-center justify-center">
            <Text className="text-white text-[12px] font-bold tracking-widest pl-1">预测</Text>
          </View>

          {/* 背景半透明水印装饰，提升高级感 */}
          <View className="absolute right-[-15px] bottom-[-15px] opacity-10 pointer-events-none">
            <Image src="https://imgpub.hhhhhy.kim/34/lengji.png" mode="aspectFit" style={{ width: '100px', height: '100px' }} />
          </View>
        </View>
      </View>

      {/* ================= 3. 常规菜单网格区 ================= */}
      {[
        { title: '常用功能', data: commonFuncs },
        { title: 'PVP 功能', data: pvpFuncs },
        { title: '图鉴功能', data: dexFuncs },
        { title: '其他功能', data: otherFuncs }
      ].map((section, idx) => (
        <View key={idx} className="bg-[#fcfdf8] rounded-[24px] p-5 shadow-sm border border-[#e8ecd8] mb-4">
          <View className="flex items-center mb-4 px-1">
            <View className="w-1.5 h-4 bg-[#a1c97a] rounded-full mr-2" />
            <Text className="text-[16px] font-extrabold text-[#3a542d]">{section.title}</Text>
          </View>
          <View className="grid grid-cols-4 gap-y-4 gap-x-2">
            {section.data.map((item, index) => (
              <View key={index} className="flex flex-col items-center active:scale-90 transition-all" onClick={() => navigateTo(item.path)}>
                <View className="bg-[#f4f7eb] border border-[#e4ebd3] rounded-[20px] mb-2 flex items-center justify-center shadow-inner" style={{ width: '56px', height: '56px' }}>
                  <Image src={item.icon || DEFAULT_ICON} mode="aspectFit" style={{ width: '32px', height: '32px' }} />
                </View>
                <Text className="text-[#597047] font-bold text-[12px]">{item.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* ================= 4. 订阅通知管理弹窗 ================= */}
      {isModalOpen && (
        <View className="fixed inset-0 z-50 flex flex-col justify-end">
          <View className="absolute inset-0 bg-[#1a2614]/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <View className="bg-[#fcfdf8] w-full h-[80vh] rounded-t-[32px] p-5 pb-6 flex flex-col relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <View className="flex-shrink-0 flex justify-between items-center mb-3 mt-2">
              <Text className="text-[20px] font-extrabold text-[#3a542d] tracking-wide">选择通知商品</Text>
              <View className="flex items-center space-x-2">
                <View className="px-4 py-1.5 rounded-full text-[13px] font-bold bg-white text-[#718c54] active:scale-95 transition-all border border-[#dce6c3] shadow-sm" onClick={() => setIsModalOpen(false)}>返回</View>
                <View className={`px-4 py-1.5 rounded-full text-[13px] font-bold active:scale-95 transition-all shadow-sm ${selectedItems.length === ALL_POSSIBLE_ITEMS.length ? 'bg-[#dcebc4] text-[#5e7a41]' : 'bg-[#eef5e3] text-[#5c8038]'}`} onClick={selectAll}>
                  {selectedItems.length === ALL_POSSIBLE_ITEMS.length ? '取消全选' : '全部通知'}
                </View>
              </View>
            </View>
            <ScrollView scrollY className="flex-1 min-h-0 mb-4">
              <View className="flex flex-col space-y-3 pb-2 px-1">
                {currentList.map((item, idx) => {
                  const isSelected = selectedItems.includes(item.name)
                  return (
                    <View key={idx} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isSelected ? 'bg-white border-[#a1c97a] shadow-sm' : 'bg-white border-[#edf2e1] shadow-sm'}`}>
                      <View className="flex items-center">
                        <View className="bg-[#f4f7eb] rounded-xl flex justify-center items-center mr-3 border border-[#e3ecd1] shadow-inner" style={{ width: '48px', height: '48px' }}>
                          <Image src={item.icon} mode="aspectFit" style={{ width: '36px', height: '36px' }} />
                        </View>
                        <Text className={`font-extrabold text-[15px] ${isSelected ? 'text-[#3a542d]' : 'text-[#597047]'}`}>{item.name}</Text>
                      </View>
                      <View onClick={() => toggleItem(item.name)} className={`px-5 py-1.5 rounded-full text-[12px] font-bold transition-all ${isSelected ? 'bg-[#a1c97a] text-white shadow-md' : 'bg-[#f4f7eb] border border-[#dcebc4] text-[#869c71]'}`}>
                        {isSelected ? '已选' : '选择'}
                      </View>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
            <View className="flex-shrink-0 flex justify-between items-center pt-4 pb-2 border-t border-[#e8ecd8] px-2">
              <View onClick={handlePrevPage} className={`px-6 py-2 rounded-full text-[13px] font-bold bg-white border border-[#dcebc4] text-[#5b6e4e] shadow-sm transition-all ${currentPage === 1 ? 'opacity-40' : 'active:scale-95'}`}>上一页</View>
              <Text className="text-[#5b7348] font-extrabold text-[15px]">{currentPage} / {totalPages}</Text>
              <View onClick={handleNextPage} className={`px-6 py-2 rounded-full text-[13px] font-bold bg-white border border-[#dcebc4] text-[#5b6e4e] shadow-sm transition-all ${currentPage === totalPages ? 'opacity-40' : 'active:scale-95'}`}>下一页</View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}