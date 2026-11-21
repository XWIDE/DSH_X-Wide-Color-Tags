// 兼容入口：dsh-plugin-guard 的校验器按 npm 形态找 lib/index.js，本包入口在根 index.js。
// 这里原样转发根入口，让校验器的 cordis 真实加载测试能跑通；宿主装载走 package.json main，不经此文件。
export { name, apply } from "../index.js";
