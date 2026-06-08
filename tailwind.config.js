module.exports = {
  // 👇 关键：这里要确保包含你所有代码文件的路径
  content: [
    "./src/pages/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/app.{js,jsx,ts,tsx}",
    "./src/index.html",
  ],
  theme: {
    extend: {
      // 🎨 这里定义了我们之前写进去的动画逻辑，防止动画类名丢失
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      },
      animation: {
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      // 现代 Tailwind (v3+) 能自动处理 JIT (Just-In-Time) 模式，
      // 不需要显式在extend里定义所有自定义Hex颜色或Shadow。
      // 但如果你发现依然是白板，我们需要在这里显式添加。目前先这样保持。
    }
  }
}