import { View, Text, Image, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useMemo } from 'react'

// 自动接入你项目里真实的精灵数据库
import { rocoData } from '../../utils/pvpTools'

export default function EggAppraisal() {
  const [keyword, setKeyword] = useState('')
  const [selectedPet, setSelectedPet] = useState<any>(null)
  
  // 模拟基因天赋输入状态 (精力、攻击、防御、魔攻、魔抗、速度)
  const [ivs, setIvs] = useState({ hp: '31', atk: '31', def: '31', spatk: '31', spdef: '31', spe: '31' })

  // 1. 实时搜索过滤精灵列表
  const filteredPets = useMemo(() => {
    if (!keyword.trim()) return []
    const kw = keyword.toLowerCase().trim()
    return (rocoData || []).filter((pet: any) => 
      pet.name?.includes(kw) || pet.no?.toLowerCase().includes(kw)
    ).slice(0, 10) // 限制展示前10条，防止卡顿
  }, [keyword])

  // 2. 动态计算计算基因纯度/评级报告
  const appraisalReport = useMemo(() => {
    if (!selectedPet) return null
    
    // 计算总天赋点数
    const totalIv = Object.values(ivs).reduce((sum, val) => sum + (parseInt(val) || 0), 0)
    const maxPossibleIv = 31 * 6
    const purityPercentage = ((totalIv / maxPossibleIv) * 100).toFixed(1)

    let grade = 'B'
    let gradeColor = 'text-blue-500 bg-blue-50 border-blue-100'
    if (totalIv >= 180) {
      grade = '👑 神级'
      gradeColor = 'text-amber-600 bg-amber-50 border-amber-200 animate-pulse'
    } else if (totalIv >= 150) {
      grade = 'S'
      gradeColor = 'text-orange-500 bg-orange-50 border-orange-100'
    } else if (totalIv >= 120) {
      grade = 'A'
      gradeColor = 'text-green-500 bg-green-50 border-green-100'
    }

    return {
      totalIv,
      purityPercentage,
      grade,
      gradeColor
    }
  }, [selectedPet, ivs])

  const handleIvChange = (key: string, value: string) => {
    let num = parseInt(value)
    if (value === '') num = 0
    if (isNaN(num) || num < 0 || num > 31) return
    setIvs({ ...ivs, [key]: value })
  }

  return (
    <View className="flex flex-col h-screen bg-[#F6F7F9] font-sans text-gray-800 overflow-hidden">
      
      {/* 顶部标题区 */}
      <View className="px-[32rpx] pt-[80rpx] pb-[24rpx] flex items-center justify-between z-50 relative bg-gradient-to-b from-[#FFF1CC] to-[#F6F7F9]">
        <View className="flex items-center gap-[12rpx]">
          <Text className="text-[32rpx] font-bold text-gray-800 tracking-wide">基因鉴定</Text>
        </View>
      </View>

      {/* 核心检索区与特征区 */}
      <View className="shrink-0 z-40 relative px-[32rpx] pb-[16rpx]">
        
        {/* 精灵搜索框 */}
        <View className="bg-white flex items-center px-[32rpx] py-[20rpx] rounded-[24rpx] shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-gray-50 mb-[24rpx]">
          <Text className="text-gray-400 text-[32rpx] mr-[16rpx]">🔍</Text>
          <Input 
            className="flex-1 text-[28rpx] bg-transparent outline-none text-gray-700" 
            placeholder="请输入想要鉴定的精灵名字或编号" 
            value={keyword}
            onInput={e => setKeyword(e.detail.value)}
          />
          {keyword && (
            <View onClick={() => setKeyword('')} className="p-[8rpx] text-gray-300 font-bold text-[24rpx]">✕</View>
          )}
        </View>

        {/* 动态搜索候选结果列表 */}
        {keyword.trim() !== '' && !selectedPet && (
          <View className="absolute left-[32rpx] right-[32rpx] top-[100rpx] bg-white rounded-[24rpx] shadow-xl border border-gray-100 z-50 max-h-[400rpx] overflow-y-auto">
            {filteredPets.map((pet: any) => (
              <View 
                key={pet.id} 
                onClick={() => { setSelectedPet(pet); setKeyword('') }}
                className="flex items-center p-[24rpx] border-b border-gray-50 active:bg-gray-50"
              >
                <Image src={pet.icon} className="w-[60rpx] h-[60rpx] mr-[20rpx]" mode="aspectFit" />
                <Text className="text-[28rpx] font-bold text-gray-700">{pet.name}</Text>
                <Text className="text-[22rpx] text-gray-400 ml-auto font-mono">{pet.no}</Text>
              </View>
            ))}
            {filteredPets.length === 0 && (
              <View className="p-[32rpx] text-center text-[24rpx] text-gray-400">未找到相关精灵</View>
            )}
          </View>
        )}

        {/* 选定精灵展示牌 */}
        {selectedPet && (
          <View className="bg-white rounded-[32rpx] p-[24rpx] shadow-sm border border-gray-50 flex items-center mb-[24rpx] relative">
            <View className="w-[110rpx] h-[110rpx] bg-[#F8F9FA] rounded-[20rpx] flex items-center justify-center shrink-0 border border-gray-100">
              <Image src={selectedPet.icon} className="w-[80rpx] h-[80rpx]" mode="aspectFit" />
            </View>
            <View className="ml-[24rpx] flex-1 min-w-0">
              <Text className="text-[32rpx] font-bold text-gray-800 block truncate">{selectedPet.name}</Text>
              <Text className="text-[22rpx] text-gray-400 font-mono mt-[4rpx] block">{selectedPet.no} · 基础种族值:{selectedPet.race_total || '未知'}</Text>
            </View>
            <View onClick={() => setSelectedPet(null)} className="px-[24rpx] py-[8rpx] rounded-full text-[22rpx] font-bold bg-red-50 text-red-500 border border-red-100 active:scale-95 transition-all cursor-pointer">
              重选
            </View>
          </View>
        )}

        {/* 天赋能力六维输入滑块区 */}
        {selectedPet && (
          <View className="bg-white rounded-[32rpx] p-[24rpx] shadow-sm border border-gray-50 flex flex-col gap-[20rpx]">
            <Text className="text-[26rpx] font-bold text-gray-400 mb-[4rpx]">请输入精灵当前的各项基因天赋 (0 - 31)</Text>
            
            {[
              { label: '精力天赋', key: 'hp' },
              { label: '攻击天赋', key: 'atk' },
              { label: '防御天赋', key: 'def' },
              { label: '魔攻天赋', key: 'spatk' },
              { label: '魔抗天赋', key: 'spdef' },
              { label: '速度天赋', key: 'spe' }
            ].map(item => (
              <View key={item.key} className="flex items-center justify-between bg-[#F8F9FA] p-[16rpx_24rpx] rounded-[16rpx]">
                <Text className="text-[26rpx] font-bold text-gray-700">{item.label}</Text>
                <Input 
                  type="number"
                  maxLength={2}
                  className="w-[100rpx] h-[50rpx] bg-white border border-gray-200 rounded-[12rpx] text-center font-bold text-[28rpx] text-gray-800"
                  value={ivs[item.key]}
                  onInput={e => handleIvChange(item.key, e.detail.value)}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 滚动分析报告生成区 */}
      <ScrollView scrollY className="flex-1 w-full h-0 pb-safe">
        {!selectedPet ? (
          <View className="flex flex-col items-center justify-center py-[120rpx] opacity-70">
            <View className="w-[200rpx] h-[200rpx] bg-white rounded-full shadow-sm border-[8rpx] border-gray-50 flex items-center justify-center mb-[32rpx] text-[80rpx]">🧬</View>
            <Text className="text-[32rpx] font-bold text-gray-600 mb-[16rpx]">请先选择鉴定精灵</Text>
            <Text className="text-[24rpx] text-gray-400 text-center px-[64rpx] leading-relaxed">
              在上方输入框检索你的精灵，选定后输入游戏中对应的数据，即可为你精准分析神秘蛋的六维纯度及成长评级。
            </Text>
          </View>
        ) : (
          appraisalReport && (
            <View className="px-[32rpx] pb-[80rpx]">
              <View className="bg-white rounded-[32rpx] p-[32rpx] border border-gray-50 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                
                {/* 装饰水印 */}
                <View className="absolute right-[-20rpx] bottom-[-20rpx] text-[150rpx] opacity-5 pointer-events-none font-black">ROCO</View>
                
                <Text className="text-[26rpx] font-bold text-gray-400 mb-[12rpx]">神秘蛋基因纯度报告</Text>
                
                {/* 综合评价评级勋章 */}
                <View className={`px-[36rpx] py-[12rpx] rounded-full border text-[32rpx] font-black tracking-wide mb-[32rpx] ${appraisalReport.gradeColor}`}>
                  {appraisalReport.grade}
                </View>

                {/* 纯度百分比读数 */}
                <View className="flex items-baseline mb-[16rpx]">
                  <Text className="text-[72rpx] font-black text-gray-800 tracking-tighter">{appraisalReport.purityPercentage}</Text>
                  <Text className="text-[28rpx] font-bold text-gray-400 ml-[4rpx]">%</Text>
                </View>
                <Text className="text-[24rpx] text-gray-400 mb-[40rpx]">总天赋：{appraisalReport.totalIv} / 186</Text>

                {/* 深度结论描述 */}
                <View className="w-full border-t border-gray-50 pt-[24rpx] text-[24rpx] text-gray-500 leading-relaxed bg-[#F8FAFF] p-[24rpx] rounded-[20rpx] border border-blue-50/50">
                  <Text className="font-bold text-[#4873F6] block mb-[8rpx]">💡 魔法学院评定建议：</Text>
                  该神秘蛋的基础纯度表现优秀。如果攻击/魔攻或速度项天赋达到 <Text className="font-bold text-orange-500 font-mono">31</Text> 点，在当前天梯或奇遇对战中将拥有极强的成长底子，建议使用高级球或棱镜精确定向培养。
                </View>

              </View>
            </View>
          )
        )}
      </ScrollView>
    </View>
  )
}