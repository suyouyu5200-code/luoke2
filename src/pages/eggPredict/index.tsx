import { View, Text, Image, ScrollView, Input, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useMemo, useEffect } from 'react'

// 引入你的真实宠物数据
import { rocoData } from '../../utils/pvpTools'

// ==============================
// 1. 原版算法 1:1 复刻区
// ==============================

// 对应原版的 o(e) 函数：解析 "0.5-0.7" 为数组
const parseRange = (rangeStr: string) => {
  if (!rangeStr || String(rangeStr).trim() === '') return null
  const parts = String(rangeStr).split('-').map(Number)
  return parts.length === 1 ? [parts[0], parts[0]] : parts.sort((a, b) => a - b)
}

// 对应原版的 l(e, t, a, n) 函数：解析 >= <= 等条件（用于大块头/小不点）
const checkThreshold = (val: number, str: string, a: number, isMax: boolean) => {
  if (!str || String(str).trim() === '') return false
  const match = String(str).trim().match(/(>=|<=|>|<)?\s*(-?\d+(\.\d+)?)/)
  if (!match) return false
  const op = match[1]
  const num = parseFloat(match[2])
  if (isNaN(num)) return false
  if (op) {
    if (op === '>') return val > num
    if (op === '>=') return val >= num
    if (op === '<') return val < num
    if (op === '<=') return val <= num
  }
  return isMax ? val >= num : val <= num
}

// 对应原版的 d(e, t, a, n, i) 函数：核心打分比例计算
const calculateBaseScore = (sizeInput: number, weightInput: number, pet: any, hasSize: boolean, hasWeight: boolean) => {
  const r = 0.005 // 原版容错率
  if (hasSize) {
    if (!pet.sizeRange) return 0
    if (sizeInput < pet.sizeRange[0] - r || sizeInput > pet.sizeRange[1] + r) return 0
  }
  if (hasWeight) {
    if (!pet.weightRange) return 0
    if (weightInput < pet.weightRange[0] - r || weightInput > pet.weightRange[1] + r) return 0
  }

  let sizeRatio = 0.5
  let weightRatio = 0.5

  if (hasSize && pet.sizeRange && pet.sizeRange[0] !== pet.sizeRange[1]) {
    sizeRatio = Math.max(0, Math.min(1, (sizeInput - pet.sizeRange[0]) / (pet.sizeRange[1] - pet.sizeRange[0])))
  }
  if (hasWeight && pet.weightRange && pet.weightRange[0] !== pet.weightRange[1]) {
    weightRatio = Math.max(0, Math.min(1, (weightInput - pet.weightRange[0]) / (pet.weightRange[1] - pet.weightRange[0])))
  }

  // 尺寸和体重都输入时的复杂惩罚与加成逻辑
  if (hasSize && hasWeight && pet.sizeRange && pet.weightRange) {
    const diff = Math.abs(sizeRatio - weightRatio)
    let score = 10 * Math.max(0.01, 1 - 2 * diff)
    
    if (diff <= 0.3) {
      const avg = (sizeRatio + weightRatio) / 2
      score *= Math.min(avg, 1 - avg) < 0.09 ? 1.5 : 0.5 - Math.abs(avg - 0.5) + 1
    } else if (diff > 0.5) {
      score *= 0.1
    }
    return score
  }

  // 只有单项输入时的逻辑
  const activeRatio = hasSize ? sizeRatio : weightRatio
  return Math.min(activeRatio, 1 - activeRatio) < 0.09 ? 5 : 1 + 4 * (0.5 - Math.abs(activeRatio - 0.5))
}


// ==============================
// 2. 页面主体组件
// ==============================
export default function EggPredict() {
  const [sizeInput, setSizeInput] = useState<string>('')
  const [weightInput, setWeightInput] = useState<string>('')
  const [rideOnly, setRideOnly] = useState<boolean>(false)
  const [history, setHistory] = useState<any[]>([])
  const [showNotice, setShowNotice] = useState<boolean>(false)

  // 初始化历史记录
  useEffect(() => {
    try {
      const hist = Taro.getStorageSync('appraise_history')
      if (hist) setHistory(JSON.parse(hist))
    } catch (e) { console.error(e) }
  }, [])

  // 防抖静默保存历史
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = sizeInput.trim()
      const w = weightInput.trim()
      if (s === '' || w === '') return
      if (history.length > 0 && history[0].size === s && history[0].weight === w) return

      const topPets = analysisResult.slice(0, 5).map((p: any) => ({ name: p.displayName || p.name, icon: p.icon }))
      const date = new Date()
      const timestamp = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

      const newRecord = { id: Date.now(), size: s, weight: w, timestamp, topPets }
      const newHistory = [newRecord, ...history].slice(0, 50)
      
      setHistory(newHistory)
      Taro.setStorageSync('appraise_history', JSON.stringify(newHistory))
    }, 2000)
    return () => clearTimeout(timer)
  }, [sizeInput, weightInput, history])

  // 核心计算属性（100%对应原版的归一化算法）
  const analysisResult = useMemo(() => {
    if (!sizeInput && !weightInput) return []
    const sVal = parseFloat(sizeInput)
    const wVal = parseFloat(weightInput)
    const hasSize = !isNaN(sVal)
    const hasWeight = !isNaN(wVal)

    let validCandidates: any[] = []

    // 1. 遍历所有宠物算出基础偏离分
    ;(rocoData || []).forEach((pet: any) => {
      // 过滤无法孵蛋的组
      if (pet.egg_groups && pet.egg_groups.includes("无法孵蛋")) return

      const displayName = (pet.name || "").replace(/\s*[（(].*?[)）]/g, "").trim()
      const p = {
        ...pet,
        displayName,
        sizeRange: parseRange(pet.size),
        weightRange: parseRange(pet.weight)
      }

      const baseScore = calculateBaseScore(sVal, wVal, p, hasSize, hasWeight)
      if (baseScore <= 0) return

      // 若你有 realHatchRecords 数据可以在此加入乘区，目前默认为 1
      const jointScore = baseScore * 1 

      let isBig = false
      let isSmall = false

      if (p.bigGuySize || p.bigGuyWeight) {
        const sBig = !hasSize || (p.bigGuySize && checkThreshold(sVal, p.bigGuySize, 0, true))
        const wBig = !hasWeight || (p.bigGuyWeight && checkThreshold(wVal, p.bigGuyWeight, 0, true))
        if ((hasSize || hasWeight) && sBig && wBig) isBig = true
      }
      if (p.smallGuySize || p.smallGuyWeight) {
        const sSmall = !hasSize || (p.smallGuySize && checkThreshold(sVal, p.smallGuySize, 0, false))
        const wSmall = !hasWeight || (p.smallGuyWeight && checkThreshold(wVal, p.smallGuyWeight, 0, false))
        if ((hasSize || hasWeight) && sSmall && wSmall) isSmall = true
      }

      validCandidates.push({
        ...p,
        jointScore,
        isDynamicBigGuy: isBig,
        isDynamicSmallGuy: isSmall
      })
    })

    // 2. 归一化为百分比（匹配原版 rawScore 和 matchScore）
    const totalJointScore = validCandidates.reduce((sum, item) => sum + item.jointScore, 0)

    let results = validCandidates.map(item => {
      const rawScore = totalJointScore > 0 ? (item.jointScore / totalJointScore) * 100 : 0
      return {
        ...item,
        rawScore,
        matchScore: rawScore.toFixed(1)
      }
    }).sort((a, b) => b.rawScore - a.rawScore)

    // 过滤同乘
    if (rideOnly) {
      results = results.filter(p => p.canRide)
    }

    return results
  }, [sizeInput, weightInput, rideOnly])

  const clearInputs = () => { setSizeInput(''); setWeightInput('') }
  const clearHistory = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要清空所有鉴定历史吗？',
      success: (res) => { if (res.confirm) { setHistory([]); Taro.removeStorageSync('appraise_history') } }
    })
  }

  const hasInput = sizeInput !== '' || weightInput !== ''

  return (
    <View className="flex flex-col h-screen bg-[#F6F7F9] font-sans text-gray-800 overflow-hidden">
      
      {/* 顶部胶囊栏 */}
      <View className="px-[32rpx] pt-[80rpx] pb-[24rpx] flex items-center justify-between z-50 relative bg-gradient-to-b from-[#FFF0E6] to-[#F6F7F9]">
        <View className="flex items-center gap-[12rpx]">
          <Text className="text-[32rpx] font-bold text-gray-800 tracking-wide">神秘蛋鉴定</Text>
          <View onClick={() => setShowNotice(true)} className="w-[36rpx] h-[36rpx] rounded-full bg-gray-200 flex items-center justify-center text-[22rpx] font-black text-gray-500 active:scale-95 cursor-pointer">
            ?
          </View>
        </View>
      </View>

      {/* 特征输入区 */}
      <View className="shrink-0 z-40 relative px-[32rpx] pb-[16rpx]">
        <View className="flex gap-[24rpx] relative z-20">
          <View className={`flex-1 bg-white rounded-[32rpx] p-[24rpx] shadow-[0_8rpx_24rpx_rgba(0,0,0,0.03)] border-[2rpx] transition-all ${sizeInput ? 'border-orange-300 bg-orange-50/20' : 'border-transparent'}`}>
            <View className="text-[24rpx] text-gray-400 mb-[8rpx] flex items-center gap-[8rpx]">蛋的尺寸(m)</View>
            <Input className="text-[40rpx] font-bold text-gray-800 w-full h-[60rpx] outline-none" placeholder="0.00" placeholderClass="text-gray-300 font-normal" type="digit" value={sizeInput} onInput={e => setSizeInput(e.detail.value)} />
          </View>
          <View className={`flex-1 bg-white rounded-[32rpx] p-[24rpx] shadow-[0_8rpx_24rpx_rgba(0,0,0,0.03)] border-[2rpx] transition-all ${weightInput ? 'border-orange-300 bg-orange-50/20' : 'border-transparent'}`}>
            <View className="text-[24rpx] text-gray-400 mb-[8rpx] flex items-center gap-[8rpx]">蛋的体重(kg)</View>
            <Input className="text-[40rpx] font-bold text-gray-800 w-full h-[60rpx] outline-none" placeholder="0.00" placeholderClass="text-gray-300 font-normal" type="digit" value={weightInput} onInput={e => setWeightInput(e.detail.value)} />
          </View>
        </View>

        <View className="mt-[24rpx] bg-white rounded-[24rpx] p-[20rpx_24rpx] shadow-[0_8rpx_24rpx_rgba(0,0,0,0.02)] flex items-center justify-between relative z-20">
          <Text className="text-[26rpx] text-gray-600 font-medium flex items-center gap-[12rpx]">仅显示可能出现『同乘』特长的精灵</Text>
          <Switch checked={rideOnly} onChange={e => setRideOnly(e.detail.value)} color="#f97316" style={{ transform: 'scale(0.7)', marginRight: '-10rpx' }} />
        </View>
      </View>

      <View className="flex items-center justify-between px-[32rpx] py-[24rpx]">
        <Text className="text-[26rpx] text-gray-500 font-bold">匹配分析报告</Text>
        <View className="flex items-center gap-[16rpx]">
          {hasInput && <View className="text-[24rpx] text-orange-600 bg-orange-50 px-[20rpx] py-[6rpx] rounded-full font-bold">{analysisResult.length} 种可能</View>}
          <View onClick={clearInputs} className="flex justify-center items-center h-[52rpx] rounded-full text-[24rpx] text-gray-400 bg-gray-200/50 px-[24rpx] active:bg-gray-300 transition-colors cursor-pointer">清空</View>
        </View>
      </View>

      {/* 滚动结果分析区 */}
      <ScrollView scrollY className="flex-1 w-full h-0 pb-safe">
        
        {!hasInput && (
          <View className="flex flex-col items-center justify-center py-[80rpx] opacity-70">
            <View className="w-[200rpx] h-[200rpx] bg-white rounded-full shadow-sm border-[8rpx] border-gray-50 flex items-center justify-center mb-[32rpx] relative text-[80rpx]">🥚</View>
            <Text className="text-[32rpx] font-bold text-gray-600 mb-[16rpx]">等待输入特征</Text>
            <Text className="text-[24rpx] text-gray-400 text-center px-[64rpx] leading-relaxed">
              请输入你在游戏中获得的神秘蛋的具体<Text className="text-green-400 mx-[4rpx]">尺寸</Text>与<Text className="text-orange-400 mx-[4rpx]">体重</Text>，我将通过大数据对比为你找出最可能的孵化结果。
            </Text>
          </View>
        )}

        {hasInput && analysisResult.length > 0 && (
          <View className="px-[32rpx] pt-[16rpx] pb-[40rpx] flex flex-col gap-[24rpx]">
            {analysisResult.map((pet, idx) => (
              <View key={idx} className="bg-white rounded-[32rpx] p-[24rpx] flex items-center relative shadow-sm border border-gray-50 active:scale-95 transition-transform">
                
                <View className="relative w-[120rpx] h-[120rpx] bg-[#F8F9FA] rounded-[24rpx] flex items-center justify-center shrink-0 border border-gray-100">
                  <View className="absolute top-0 left-0 bg-gray-200 text-gray-500 text-[18rpx] font-mono px-[12rpx] py-[4rpx] rounded-br-[16rpx] rounded-tl-[24rpx] z-10">{pet.no}</View>
                  <Image src={pet.icon} mode="aspectFit" className="w-[80rpx] h-[80rpx]" />
                </View>

                <View className="flex-1 flex flex-col justify-center pl-[24rpx] min-w-0 py-[4rpx]">
                  <Text className="text-[28rpx] font-bold text-gray-800 truncate mb-[6rpx]">{pet.displayName || pet.name}</Text>
                  
                  <View className="flex flex-wrap items-center gap-[10rpx] mb-[10rpx]">
                    {idx === 0 && <View className="bg-red-50 text-red-500 text-[18rpx] px-[12rpx] py-[4rpx] rounded-full border border-red-100 font-bold shrink-0">最可能</View>}
                    {pet.canRide && <View className="bg-blue-50 text-blue-500 text-[18rpx] px-[12rpx] py-[4rpx] rounded-full border border-blue-100 font-bold shrink-0">概率同乘</View>}
                    {pet.isDynamicBigGuy && <View className="bg-purple-50 text-purple-500 text-[18rpx] px-[12rpx] py-[4rpx] rounded-full border border-purple-100 font-bold shrink-0">大块头</View>}
                    {pet.isDynamicSmallGuy && <View className="bg-teal-50 text-teal-500 text-[18rpx] px-[12rpx] py-[4rpx] rounded-full border border-teal-100 font-bold shrink-0">小不点</View>}
                  </View>

                  <View className="flex flex-col gap-[8rpx]">
                    <View className="flex items-center text-[22rpx]"><Text className="text-gray-400 w-[64rpx]">尺寸:</Text><Text className="text-gray-600 font-mono">{pet.size}</Text></View>
                    <View className="flex items-center text-[22rpx]"><Text className="text-gray-400 w-[64rpx]">体重:</Text><Text className="text-gray-600 font-mono">{pet.weight}</Text></View>
                  </View>
                </View>

                <View className="flex flex-col items-end justify-center shrink-0 border-l border-gray-50 pl-[24rpx] ml-[8rpx]">
                  <Text className={`text-[40rpx] font-black tracking-tighter ${parseFloat(pet.matchScore) >= 80 ? 'text-green-500' : parseFloat(pet.matchScore) >= 50 ? 'text-orange-400' : 'text-gray-400'}`}>
                    {pet.matchScore}<Text className="text-[20rpx] ml-[2rpx]">%</Text>
                  </Text>
                  <Text className="text-[18rpx] text-gray-400 mt-[4rpx] font-medium tracking-widest">匹配度</Text>
                </View>

              </View>
            ))}
          </View>
        )}

        {hasInput && analysisResult.length === 0 && (
          <View className="py-[80rpx] flex flex-col items-center justify-center text-gray-400">
            <Text className="text-[80rpx] mb-[24rpx] opacity-30">⚠️</Text>
            <Text className="text-[28rpx]">没有任何精灵符合该数据</Text>
            <Text className="text-[24rpx] mt-[8rpx] opacity-70">数据是否输入有误？</Text>
          </View>
        )}

        <View className="px-[32rpx] mt-[20rpx] pb-[80rpx]">
          <View className="flex items-center justify-between mb-[24rpx]">
            <View className="flex items-center gap-[12rpx]">
              <View className="w-[6rpx] h-[24rpx] bg-blue-400 rounded-full" />
              <Text className="text-[28rpx] font-bold text-gray-600">历史鉴定记录</Text>
            </View>
            {history.length > 0 && <Text onClick={clearHistory} className="text-[24rpx] text-gray-400 active:opacity-70 cursor-pointer transition-colors">清空历史</Text>}
          </View>

          {history.length === 0 ? (
            <View className="py-[40rpx] text-center text-[24rpx] text-gray-400 bg-white/50 rounded-[24rpx] border border-gray-100 border-dashed">暂无历史记录</View>
          ) : (
            <View className="flex flex-col gap-[20rpx]">
              {history.map((record: any) => (
                <View key={record.id} className="bg-white rounded-[24rpx] p-[24rpx] border border-gray-100 shadow-sm active:scale-95 transition-transform cursor-pointer" onClick={() => { setSizeInput(record.size); setWeightInput(record.weight) }}>
                  <View className="flex justify-between items-center mb-[16rpx]">
                    <View className="flex items-center gap-[24rpx] text-[26rpx] text-gray-700 font-mono font-bold">
                      <View><Text className="text-green-500 mr-[10rpx]">S:</Text>{record.size}m</View>
                      <View><Text className="text-orange-500 mr-[10rpx]">W:</Text>{record.weight}kg</View>
                    </View>
                    <Text className="text-[22rpx] text-gray-400 shrink-0">{record.timestamp}</Text>
                  </View>
                  <View className="flex gap-[16rpx] overflow-x-auto hide-scrollbar">
                    {record.topPets && record.topPets.length > 0 ? record.topPets.map((pet: any, idx: number) => (
                      <View key={idx} className="w-[72rpx] h-[72rpx] bg-[#F8F9FA] rounded-[16rpx] flex items-center justify-center shrink-0 border border-gray-50">
                        <Image src={pet.icon} mode="aspectFit" className="w-[54rpx] h-[54rpx]" />
                      </View>
                    )) : <Text className="text-[24rpx] text-gray-400 py-[12rpx]">未匹配到符合结果</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 底部注意事项弹窗 */}
      {showNotice && (
        <View className="fixed inset-0 z-[999] flex items-center justify-center px-[40rpx]">
          <View onClick={() => setShowNotice(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
          <View className="bg-white rounded-[40rpx] w-full max-w-[620rpx] relative z-10 flex flex-col overflow-hidden shadow-2xl box-border">
            <View className="px-[40rpx] pt-[40rpx] pb-[24rpx] flex items-center justify-between">
              <Text className="text-[36rpx] font-black text-gray-800">注意事项</Text>
              <View onClick={() => setShowNotice(false)} className="w-[60rpx] h-[60rpx] flex items-center justify-end text-[54rpx] text-gray-300 active:scale-95 mb-[8rpx]">×</View>
            </View>
            <ScrollView scrollY className="max-h-[60vh] w-full box-border">
              <View className="flex flex-col gap-[32rpx] text-[28rpx] text-gray-600 leading-relaxed px-[40rpx] pb-[20rpx] w-full box-border">
                
                <View className="bg-orange-50/50 p-[24rpx] rounded-[24rpx] border border-orange-100 w-full box-border">
                  <View className="font-black text-orange-600 mb-[12rpx] text-[30rpx]">🥚 赛季限定精灵</View>
                  <View className="break-words">赛季限定精灵只能在<Text className="font-bold text-orange-500"> 赛季奇遇蛋 </Text>或者<Text className="font-bold text-orange-500"> 家园生出的专属蛋 </Text>中孵出，例如：柴渣虫、双灯鱼等。</View>
                </View>

                <View className="bg-blue-50/50 p-[24rpx] rounded-[24rpx] border border-blue-100 w-full box-border">
                  <View className="font-black text-blue-600 mb-[12rpx] text-[30rpx]">🐾 小帕尔</View>
                  <View className="break-words">小帕尔目前只在<Text className="font-bold text-blue-500"> 任务蛋 </Text>中孵出，别的蛋无法孵出。</View>
                </View>

                <View className="bg-red-50/50 p-[24rpx] rounded-[24rpx] border border-red-100 w-full box-border">
                  <View className="font-black text-red-500 mb-[12rpx] text-[30rpx]">⚠️ 总结</View>
                  <View className="break-words">随机蛋<Text className="font-bold text-red-500"> 无法 </Text>孵出以上提到的精灵。大家对比的时候要注意，<Text className="font-bold text-gray-800"> 不要误用棱镜球 </Text>，数据仅提供参考。</View>
                </View>

              </View>
            </ScrollView>
            <View className="px-[40rpx] py-[32rpx] bg-[#F8F9FA] border-t border-gray-50">
              <View onClick={() => setShowNotice(false)} className="w-full bg-gray-800 text-white rounded-[24rpx] py-[24rpx] text-center font-bold text-[32rpx] active:scale-95 transition-transform shadow-md">
                我知道了
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}