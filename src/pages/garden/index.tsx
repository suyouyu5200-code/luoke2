import { View, Text, Image, ScrollView, Input, Progress } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'

// 如果你有存放物品映射的文件，可以引入；这里用空对象兜底，防止报错
const homeItemsMap: any = {} 
const DEFAULT_ICON = 'https://imgpub.hhhhhy.kim/34/xuancai.png'

export default function GardenQuery() {
  // ==============================
  // 1. 状态管理
  // ==============================
  const [gardenUid, setGardenUid] = useState('')
  const [isGardenLoading, setIsGardenLoading] = useState(false)
  const [gardenData, setGardenData] = useState<any>(null)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    try {
      const hist = Taro.getStorageSync('garden_history')
      if (hist) setHistory(JSON.parse(hist))
    } catch (e) {}
  }, [])

  // ==============================
  // 2. 核心查询与解析逻辑 (完美保留你的原版代码)
  // ==============================
  const handleGardenQuery = (searchUid?: string) => {
    const targetUid = searchUid || gardenUid
    if (!targetUid.trim()) return Taro.showToast({ title: '请输入 UID', icon: 'none' })
    
    setGardenUid(targetUid)
    setIsGardenLoading(true)

    // 保存历史记录
    const newHistory = [targetUid, ...history.filter(item => item !== targetUid)].slice(0, 5)
    setHistory(newHistory)
    Taro.setStorageSync('garden_history', JSON.stringify(newHistory))

    Taro.request({
      url: `http://47.109.57.230:15200/api/garden/proxy?uid=${targetUid}`,
      success: (res) => {
        const raw = res.data?.data?.result?.home_info || res.data?.data?.home_info || res.data?.home_info
        if (!raw) {
          setGardenData(null)
          return Taro.showToast({ title: '查询失败或无数据', icon: 'none' })
        }
        
        const brief = raw.friend_home_brief_info || raw.home_brief_info || {}
        const cell = raw.friend_cell_home_brief_info || raw.cell_home_brief_info || {}
        const nowTs = Math.floor(Date.now() / 1000)

        // 解析菜园
        const plots: any[] = []
        const plantSources = raw.home_plants || []
        const landList = cell.home_plant_info?.home_plant_land_list || []
        landList.forEach((land: any) => { (land.home_plant_list || []).forEach((item: any) => { plots.push({ ...item, land_index: land.land_index }) }) })
        
        const formattedPlots = [...plantSources, ...plots].map((p: any, idx) => {
          const pData = p.plant_info || p
          const id = String(p.plant_seed_id || p.plant_id || pData.id || 0)
          if (id === '0') return null
          
          const mapped = homeItemsMap[id] || {}
          const ripTime = p.plant_rip_time || p.rip_time || p.end_time || 0
          const isReady = (ripTime > 0 && nowTs >= ripTime) || [2, 'ready', 'mature'].includes(p.status)
          const totalTime = p.time_cost || p.total_time || (p.plant_tab_id ? p.plant_tab_id * 21600 : 0)
          
          let prog = 35
          if (totalTime && ripTime) prog = Math.max(0, Math.min(100, ((totalTime - Math.max(0, ripTime - nowTs)) / totalTime) * 100))
          if (isReady) prog = 100

          let leftStr = '可收获'
          if (!isReady && ripTime) {
            const remain = Math.max(0, ripTime - nowTs)
            const h = Math.floor(remain / 3600), m = Math.floor((remain % 3600) / 60)
            leftStr = h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
          }

          let iconUrl = DEFAULT_ICON
          const iconId = pData.icon_url || pData.iconid || mapped.iconid || ''
          if (iconId) {
            if (String(iconId).startsWith('http://')) iconUrl = String(iconId).replace('http://', 'https://')
            else if (String(iconId).startsWith('https://')) iconUrl = String(iconId)
            else iconUrl = `https://game.gtimg.cn/images/rocom/rocodata/jingling/${iconId}/icon.png`
          }

          return {
            index: p.slot_index || p.land_index || idx + 1,
            name: pData.name || p.name || mapped.name || `作物${id}`,
            icon: iconUrl, isReady, leftStr, prog,
            harvest: p.plant_harvest_num || '',
            steal: p.plant_steal_account !== undefined ? `${p.plant_steal_account}/${p.plant_can_steal_account}` : ''
          }
        }).filter(Boolean)

        // 解析精灵
        const indoor: any[] = []; const guard: any[] = [];
        const rawIndoor = [...(raw.home_pets || []), ...((cell.home_pets || []).filter((i:any) => i.home_pet_info?.pet_cfg_id !== 0)), ...(cell.home_pet_info?.home_pet_list || [])]
        const rawGuard = [...(raw.guard_pets || []), ...(cell.guard_pets || [])]
        if (raw.guard_pet) rawGuard.push(raw.guard_pet)

        const parsePet = (p: any, isGd: boolean) => {
          const pInfo = p.home_pet_info || p
          const pId = pInfo.pet_cfg_id || pInfo.pet_id || p.id || 0
          if (!pId && !isGd) return null
          
          const ripTime = pInfo.pet_rip_time || p.rip_time || 0
          const isReady = ripTime > 0 && nowTs >= ripTime
          const hasInspiration = ripTime > 0
          
          let leftStr = isGd ? '守卫中' : '暂无灵感'
          if (hasInspiration && !isReady) {
            const remain = Math.max(0, ripTime - nowTs)
            const h = Math.floor(remain / 3600), m = Math.floor((remain % 3600) / 60)
            leftStr = h > 0 ? `${h}小时${m}分` : `${m}分钟`
          }
          if (isReady) leftStr = '灵感已完成'

          let iconUrl = p.icon_url || p.pet_img_url || ''
          if (!iconUrl && pId) iconUrl = `https://game.gtimg.cn/images/rocom/rocodata/jingling/${pId < 3000 ? Number(pId)+3000 : pId}/icon.png`
          else if (iconUrl.startsWith('http://')) iconUrl = iconUrl.replace('http://', 'https://')

          return {
            id: pId, name: pInfo.name || p.name || `精灵${pId}`,
            level: p.display_info?.level || p.level || pInfo.level || '--',
            icon: iconUrl, isGuard: isGd, isReady, hasInspiration, leftStr
          }
        }

        rawIndoor.forEach(p => { const parsed = parsePet(p, false); if (parsed) indoor.push(parsed) })
        rawGuard.forEach(p => { const parsed = parsePet(p, true); if (parsed) guard.push(parsed) })

        setGardenData({
          homeName: brief.home_name || brief.name || `${targetUid} 的小屋`,
          level: brief.home_level || '--', comfort: brief.home_comfort_level || '--', exp: brief.home_experience || '--',
          plots: formattedPlots, indoor, guard
        })
      },
      fail: () => Taro.showToast({ title: '网络请求失败', icon: 'none' }),
      complete: () => setIsGardenLoading(false)
    })
  }

  const clearHistory = () => {
    setHistory([])
    Taro.removeStorageSync('garden_history')
    setGardenData(null)
  }

  return (
    <View className="min-h-screen bg-[#f3f7ea] font-sans pb-safe box-border flex flex-col">
      
      {/* ================= 3. 顶部标题 ================= */}
      <View className="px-5 pt-[80rpx] pb-4 flex items-center justify-between z-50 relative">
        <Text className="text-[20px] font-extrabold text-[#3a542d] tracking-wide">家园查询</Text>
      </View>

      <ScrollView scrollY className="flex-1 px-4">
        
        {/* ================= 4. 绑定与查询卡片 ================= */}
        <View className="bg-[#fcfdf8] rounded-[24px] p-5 shadow-sm border border-[#e8ecd8] mb-4">
          <View className="flex items-center mb-4 px-1">
            <View className="w-1.5 h-4 bg-[#a1c97a] rounded-full mr-2" />
            <Text className="text-[16px] font-extrabold text-[#3a542d]">输入家园 UID</Text>
          </View>
          
          <View className="flex items-center bg-[#f4f7eb] rounded-2xl px-4 py-3 border border-[#e4ebd3] shadow-inner mb-4 transition-all focus-within:border-[#a1c97a]">
            <Text className="text-[16px] mr-2">🆔</Text>
            <Input 
              className="flex-1 text-[14px] text-[#3a542d] font-bold outline-none bg-transparent" 
              placeholder="请输入UID (如 5052703)" 
              placeholderClass="text-[#869677] font-normal"
              type="number"
              value={gardenUid}
              onInput={e => setGardenUid(e.detail.value)}
              onConfirm={() => handleGardenQuery()}
            />
            {gardenUid && (
              <View onClick={() => setGardenUid('')} className="p-1 text-[#a1c97a] font-bold text-[14px] active:scale-90 z-10">✕</View>
            )}
          </View>

          <View 
            onClick={() => handleGardenQuery()} 
            className={`w-full py-3.5 rounded-2xl flex items-center justify-center font-bold text-white text-[15px] shadow-sm transition-all active:scale-95 ${isGardenLoading ? 'bg-[#c5dcb3]' : 'bg-[#a1c97a]'}`}
          >
            {isGardenLoading ? '加载数据中...' : '立即查询'}
          </View>
        </View>

        {/* 历史记录按钮 */}
        {history.length > 0 && !gardenData && (
          <View className="px-2 mb-4">
            <View className="flex items-center justify-between mb-2">
              <Text className="text-[13px] font-bold text-[#869677]">历史查询记录</Text>
              <Text onClick={clearHistory} className="text-[12px] text-[#a1c97a] active:opacity-70 font-bold p-1">清空</Text>
            </View>
            <View className="flex flex-wrap gap-2">
              {history.map((h, idx) => (
                <View key={idx} onClick={() => handleGardenQuery(h)} className="bg-white border border-[#e8ecd8] text-[#5e7a45] text-[13px] px-4 py-1.5 rounded-full font-bold active:scale-95 shadow-sm cursor-pointer">
                  {h}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= 5. 查询结果展示区 ================= */}
        {gardenData && (
          <View className="flex flex-col gap-4 pb-10 animation-fade-in">
            
            {/* 面板 1：家园基础信息 */}
            <View className="bg-[#fcfdf8] rounded-[24px] p-5 shadow-sm border border-[#e8ecd8] relative overflow-hidden">
              <View className="absolute right-[-10px] top-[-10px] text-[80px] opacity-[0.03] pointer-events-none">🏡</View>
              
              <View className="flex items-center mb-4 px-1">
                <View className="w-1.5 h-4 bg-[#a1c97a] rounded-full mr-2" />
                <Text className="text-[16px] font-extrabold text-[#3a542d] truncate pr-4">{gardenData.homeName}</Text>
              </View>

              <View className="flex justify-between items-center bg-[#f4f7eb] border border-[#e4ebd3] rounded-[20px] p-4 shadow-inner">
                <View className="flex flex-col items-center flex-1 border-r border-[#dcebc4]">
                  <Text className="text-[20px] font-black text-[#5e7a45] mb-1 tracking-tight">Lv.{gardenData.level}</Text>
                  <Text className="text-[11px] text-[#869677]">家园等级</Text>
                </View>
                <View className="flex flex-col items-center flex-1 border-r border-[#dcebc4]">
                  <Text className="text-[20px] font-black text-[#5e7a45] mb-1 tracking-tight">{gardenData.comfort}</Text>
                  <Text className="text-[11px] text-[#869677]">舒适度</Text>
                </View>
                <View className="flex flex-col items-center flex-1">
                  <Text className="text-[20px] font-black text-[#5e7a45] mb-1 tracking-tight">{gardenData.exp}</Text>
                  <Text className="text-[11px] text-[#869677]">经验值</Text>
                </View>
              </View>
            </View>

            {/* 面板 2：农场种植进度 */}
            <View className="bg-[#fcfdf8] rounded-[24px] p-5 shadow-sm border border-[#e8ecd8]">
              <View className="flex items-center mb-4 px-1">
                <View className="w-1.5 h-4 bg-[#a1c97a] rounded-full mr-2" />
                <Text className="text-[16px] font-extrabold text-[#3a542d]">农作物进度 ({gardenData.plots.length})</Text>
              </View>

              {gardenData.plots && gardenData.plots.length > 0 ? (
                <View className="flex flex-col gap-3">
                  {gardenData.plots.map((crop: any, idx: number) => (
                    <View key={idx} className="flex flex-col bg-white border border-[#e8ecd8] rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      <View className="flex items-center justify-between mb-3">
                        <View className="flex items-center">
                          <View className="w-[44px] h-[44px] bg-[#f4f7eb] rounded-xl flex items-center justify-center mr-3 border border-[#e4ebd3] shadow-inner relative">
                            {/* 田地序号角标 */}
                            <View className="absolute top-0 left-0 bg-[#dcebc4] text-[#5e7a45] text-[9px] px-1.5 rounded-br-md rounded-tl-xl font-bold">{crop.index}</View>
                            <Image src={crop.icon} mode="aspectFit" className="w-[28px] h-[28px]" />
                          </View>
                          <View className="flex flex-col">
                            <Text className="text-[14px] font-extrabold text-[#3a542d] tracking-wide mb-0.5">{crop.name}</Text>
                            <View className="flex gap-2">
                              {crop.harvest && <Text className="text-[10px] text-[#869677] bg-[#f4f7eb] px-1.5 rounded-sm">产量 {crop.harvest}</Text>}
                              {crop.steal && <Text className="text-[10px] text-[#869677] bg-[#f4f7eb] px-1.5 rounded-sm">被偷 {crop.steal}</Text>}
                            </View>
                          </View>
                        </View>
                        <View className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm ${crop.isReady ? 'bg-[#a1c97a] text-white' : 'bg-[#eef5e3] text-[#5e7a45] border border-[#dcebc4]'}`}>
                          {crop.leftStr}
                        </View>
                      </View>
                      
                      {/* 生长进度条 */}
                      <Progress percent={crop.prog} active activeColor={crop.isReady ? '#a1c97a' : '#c5dcb3'} backgroundColor="#f4f7eb" strokeWidth={5} borderRadius={4} />
                    </View>
                  ))}
                </View>
              ) : (
                <View className="py-6 flex flex-col items-center opacity-60">
                  <Text className="text-[40px] mb-2 grayscale-[0.2]">🌱</Text>
                  <Text className="text-[13px] font-bold text-[#869677]">当前农场没有种植作物</Text>
                </View>
              )}
            </View>

            {/* 面板 3：精灵状态 (室内 + 守卫) */}
            {(gardenData.indoor.length > 0 || gardenData.guard.length > 0) && (
              <View className="bg-[#fcfdf8] rounded-[24px] p-5 shadow-sm border border-[#e8ecd8]">
                <View className="flex items-center mb-4 px-1">
                  <View className="w-1.5 h-4 bg-[#a1c97a] rounded-full mr-2" />
                  <Text className="text-[16px] font-extrabold text-[#3a542d]">精灵灵感与守卫</Text>
                </View>

                <View className="flex flex-col gap-3">
                  {[...gardenData.guard, ...gardenData.indoor].map((pet: any, idx: number) => (
                    <View key={idx} className="flex items-center justify-between bg-white border border-[#e8ecd8] rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      <View className="flex items-center">
                        <View className="w-[44px] h-[44px] bg-[#f4f7eb] rounded-xl flex items-center justify-center mr-3 border border-[#e4ebd3] shadow-inner relative">
                          {/* 守卫专属红色角标 */}
                          {pet.isGuard && <View className="absolute top-0 right-0 bg-red-100 text-red-500 text-[9px] px-1.5 rounded-bl-md rounded-tr-xl font-black z-10">守卫</View>}
                          <Image src={pet.icon} mode="aspectFit" className="w-[34px] h-[34px]" />
                        </View>
                        <View className="flex flex-col">
                          <Text className="text-[14px] font-extrabold text-[#3a542d] tracking-wide">{pet.name}</Text>
                          <Text className="text-[11px] font-bold text-[#869677] mt-0.5">Lv. {pet.level}</Text>
                        </View>
                      </View>
                      <View className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm ${pet.isReady || pet.isGuard ? 'bg-[#a1c97a] text-white' : 'bg-[#eef5e3] text-[#5e7a45] border border-[#dcebc4]'}`}>
                        {pet.leftStr}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 底部按钮 */}
            <View onClick={() => setGardenData(null)} className="mt-2 py-3.5 rounded-2xl flex items-center justify-center font-bold text-[#5e7a45] text-[15px] bg-[#eef5e3] border border-[#dcebc4] active:scale-95 transition-transform shadow-sm">
              查询其它 UID
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  )
}