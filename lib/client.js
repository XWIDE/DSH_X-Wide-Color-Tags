// dsh-xwide-color-tags · 客户端半部 v0.1.0
// 在会话右键菜单里插一条色板（官方槽 sidebar.workspaces.session.menu.item），
// 选色后写进 localStorage，并给侧栏对应会话行上色（左边色带 + 淡底）。
// 色板形式照 dsh-xwide-annotation 的「批注配色」：四预设 + conic 彩虹自选 + ✕ 清除。
// 存储键前缀 xwcolor.*，与 @michengai/dsh-codex-ui(michengai.codex-ui.*)、
// dsh-xwide-annotation(dshap.*) 零交集。零运行时依赖，react 由宿主提供。
window.__ModuleLoader__.load({
	id: "dsh-xwide-color-tags",
	factory: (require) => {
		const module = { exports: {} };
		const exports = module.exports;
		const react = require("react");

		const SLOT = "sidebar.workspaces.session.menu.item";
		const ITEM_ID = "xw-color-tags";
		const ITEM_ORDER = 900; // 内置项：置顶 100 / 重命名 200 / 归档；codex-ui 未读=150。取 900 排最后＝红框那块空位
		const CSS_TAG = "xw-color-tags";
		const KEY_MAP = "xwcolor.map"; // { sessionId: hex }
		const KEY_CUSTOM = "xwcolor.customs"; // 自定义色数组
		const KEY_PROBE = "xwcolor.probe"; // 会话行 DOM 形状探针（诊断用）

		// 照抄 dsh-xwide-annotation client.js:1012-1017 的四色
		const PRESETS = [
			{ name: "荧光黄", hex: "#ffc300" },
			{ name: "荧光绿", hex: "#2ecc71" },
			{ name: "荧光青", hex: "#00c8ff" },
			{ name: "荧光粉", hex: "#ff63c5" },
		];
		const RAINBOW = "conic-gradient(#ff4444,#ffc300,#2ecc71,#00c8ff,#b06bff,#ff63c5)";

		const ZH = {
			"title": "会话颜色",
			"clear": "清除颜色",
			"custom": "我的颜色",
			"reset": "恢复默认",
			"cancel": "取消",
			"ok": "确定",
			"probeHint": "（探针已记录会话行形状：localStorage[" + KEY_PROBE + "]）",
		};
		const EN = {
			"title": "Session color",
			"clear": "Clear color",
			"custom": "My colors",
			"reset": "Reset",
			"cancel": "Cancel",
			"ok": "OK",
			"probeHint": " (row-shape probe saved to localStorage[" + KEY_PROBE + "])",
		};

		// 语言判定只用标准 DOM（宿主 ctx.locale 的取值形状本机未验到，不猜）
		function t(key) {
			const l = String(document.documentElement.getAttribute("lang")
				|| (typeof navigator !== "undefined" && navigator.language)
				|| "zh").toLowerCase();
			const dict = l.startsWith("zh") ? ZH : EN;
			return dict[key] || key;
		}

		// ---------- 存储 ----------
		function readMap() {
			try {
				const raw = localStorage.getItem(KEY_MAP);
				const obj = raw ? JSON.parse(raw) : {};
				return obj && typeof obj === "object" ? obj : {};
			} catch { return {}; }
		}
		function writeMap(map) {
			try { localStorage.setItem(KEY_MAP, JSON.stringify(map)); } catch {}
			paintAll();
		}
		function readCustoms() {
			try {
				const raw = localStorage.getItem(KEY_CUSTOM);
				const arr = raw ? JSON.parse(raw) : [];
				return Array.isArray(arr) ? arr : [];
			} catch { return []; }
		}
		function writeCustoms(arr) {
			try { localStorage.setItem(KEY_CUSTOM, JSON.stringify(arr.slice(-8))); } catch {}
		}

		// ---------- 上色：给会话行写 CSS 变量 ----------
		// 会话行的真实选择器本机未验到（GUI 401 无 token），故按候选列表探测并记进探针日志。
		const ROW_CANDIDATES = [
			"[data-row-key]",
			"[data-session-id]",
			"a[href*='session']",
			"li[data-key]",
		];

		function rowKeyOf(el) {
			return el.getAttribute("data-row-key")
				|| el.getAttribute("data-session-id")
				|| el.getAttribute("data-key")
				|| "";
		}

		function probeRows() {
			const found = {};
			for (const sel of ROW_CANDIDATES) {
				let n = 0; let sampleKeys = [];
				try {
					const list = document.querySelectorAll(sel);
					n = list.length;
					for (let i = 0; i < Math.min(3, n); i++) {
						const k = rowKeyOf(list[i]);
						sampleKeys.push(k ? String(k).slice(0, 24) : "(nokey)");
					}
				} catch {}
				found[sel] = { count: n, sampleKeys };
			}
			const rec = { ts: Date.now(), found };
			try { localStorage.setItem(KEY_PROBE, JSON.stringify(rec)); } catch {}
			return rec;
		}

		function paintAll() {
			const map = readMap();
			// 清掉旧的
			document.querySelectorAll("[data-xwc]").forEach((el) => {
				if (!map[rowKeyOf(el)]) {
					el.removeAttribute("data-xwc");
					el.style.removeProperty("--xwc-color");
				}
			});
			for (const sel of ROW_CANDIDATES) {
				let list;
				try { list = document.querySelectorAll(sel); } catch { continue; }
				list.forEach((el) => {
					const key = rowKeyOf(el);
					const hex = key && map[key];
					if (hex) {
						el.setAttribute("data-xwc", "1");
						el.style.setProperty("--xwc-color", hex);
					}
				});
			}
		}

		function injectCss() {
			if (document.querySelector("style[data-plugin-css=\"" + CSS_TAG + "\"]")) return;
			const css = [
				".xwc-bar{display:flex;flex-direction:row;align-items:center;gap:6px;padding:6px 10px;flex-wrap:wrap}",
				".xwc-title{font-size:12px;opacity:.7;margin-right:2px}",
				".xwc-sw{width:32px;height:32px;border-radius:9px;cursor:pointer;border:2px solid transparent}",
				".xwc-sw[data-on=\"1\"]{border-color:#fff}",
				".xwc-rainbow{background:" + RAINBOW + "}",
				".xwc-clear{width:32px;height:32px;border-radius:9px;cursor:pointer;border:2px solid transparent;font-size:14px;line-height:28px;text-align:center;opacity:.75}",
				".xwc-clear:hover{opacity:1}",
				".xwc-reset{height:32px;padding:0 10px;border-radius:9px;cursor:pointer;border:1px solid rgba(255,255,255,.28);font-size:12px;line-height:30px;text-align:center;opacity:.8;white-space:nowrap;color:#eee}",
				".xwc-reset:hover{opacity:1;background:rgba(255,255,255,.1)}",
				"[data-xwc=\"1\"]{box-shadow:inset 3px 0 0 0 var(--xwc-color,transparent)}",
				"[data-xwc=\"1\"]>span,[data-xwc=\"1\"] [class*=\"title\"]{color:var(--xwc-color,inherit)}",
				".xwc-dot{display:inline-block;flex:none;width:10px;height:10px;border-radius:50%;margin-right:5px;border:1px solid rgba(255,255,255,.45);cursor:pointer;vertical-align:middle}",
				".xwc-dot[data-on=\"1\"]{border-color:#fff}",
				".xwc-pop{position:fixed;z-index:9999;display:flex;flex-direction:row;align-items:center;gap:6px;padding:8px;background:rgba(24,24,28,.97);border:1px solid rgba(255,255,255,.16);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.45)}",
			].join("\n");
			const style = document.createElement("style");
			style.setAttribute("data-plugin-css", CSS_TAG);
			style.textContent = css;
			document.head.appendChild(style);
		}

		// ---------- 色板组件（菜单内联，官方槽给的就是菜单里的一块位置）----------
		function Swatch(props) {
			const hex = props.hex;
			const on = props.on ? "1" : "0";
			return react.createElement("div", {
				className: "xwc-sw" + (props.rainbow ? " xwc-rainbow" : ""),
				role: "menuitem",
				title: props.title,
				"data-on": on,
				"data-context-menu-trigger": "1", // 落进 codex-ui 全局按钮扫描的排除名单
				style: props.rainbow ? {} : { background: hex },
				onClick: () => props.pick(hex),
			});
		}

		function ColorBar(props) {
			const current = props.current;
			const customs = readCustoms();
			const pick = (hex) => { props.pick(hex); };
			const kids = [react.createElement("span", { className: "xwc-title", key: "t" }, props.t("title"))];
			for (const p of PRESETS) {
				kids.push(react.createElement(Swatch, {
					key: p.hex, hex: p.hex, title: p.name, on: current === p.hex, pick,
				}));
			}
			for (const c of customs) {
				kids.push(react.createElement(Swatch, {
					key: "c" + c, hex: c, title: c, on: current === c, pick,
				}));
			}
			kids.push(react.createElement(Swatch, {
				key: "rainbow", hex: "", rainbow: true, title: "自定义取色", on: false,
				pick: () => props.pickCustom(),
			}));
			if (current) {
				kids.push(react.createElement("div", {
					className: "xwc-clear", role: "menuitem", title: props.t("clear"),
					"data-context-menu-trigger": "1",
					onClick: () => props.pick(null),
				}, "✕"));
			}
			return react.createElement("div", { className: "xwc-bar" }, kids);
		}

		function MenuEntry(props) {
			const sessionId = props.sessionId;
			const [, setMenuOpen] = props.useMenuOpenState();
			const [current, setCurrent] = react.useState(() => readMap()[sessionId] || "");

			const apply = (hex) => {
				const map = readMap();
				if (hex) map[sessionId] = hex;
				else delete map[sessionId];
				writeMap(map);
				setCurrent(hex || "");
			};
			const pickCustom = () => {
				// 用原生取色盘（零依赖）；取消＝null，不动数据
				const inp = document.createElement("input");
				inp.type = "color";
				inp.value = current || "#ffc300";
				inp.style.cssText = "position:fixed;left:-9999px;top:0";
				document.body.appendChild(inp);
				inp.addEventListener("input", () => {
					const hex = inp.value;
					const customs = readCustoms();
					if (!customs.includes(hex)) { customs.push(hex); writeCustoms(customs); }
					apply(hex);
				});
				inp.addEventListener("change", () => {
					setMenuOpen(false);
					setTimeout(() => inp.remove(), 0);
				});
				inp.click();
			};

			return react.createElement(ColorBar, {
				current,
				pick: (hex) => { apply(hex); setMenuOpen(false); },
				pickCustom,
				t,
			});
		}

		// ---------- 行内色点 + 弹板取色（纯 DOM：菜单槽被 project-groups 占死，实测两本账不通）----------
		let pop = null;
		const closePop = () => { if (pop) { pop.remove(); pop = null; } };

		function setKeyColor(key, hex) {
			const map = readMap();
			if (hex) map[key] = hex;
			else delete map[key];
			writeMap(map);
		}

		// ---------- HSV 取色面板（照用户第二张图：大色域方块＋明暗滑块＋色相条＋hex/RGB＋「取消」「确定」）----------
		// 原生 input[type=color] 样式不可控 → 纯 DOM 自绘；面板内右键＝取消（与色块右键同一套机制）。
		const clamp01 = (x) => Math.min(1, Math.max(0, x));
		function hsv2rgb(hh, ss, vv) {
			const f = (n) => { const k = (n + hh / 60) % 6; return vv - vv * ss * Math.max(0, Math.min(k, 4 - k, 1)); };
			return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
		}
		function rgb2hex(r, g, b) {
			return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
		}
		function hex2hsv(hex) {
			const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
			if (!m) return [45, 1, 1];
			const ch = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
			const mx = Math.max(ch[0], ch[1], ch[2]), mn = Math.min(ch[0], ch[1], ch[2]), d = mx - mn;
			let hh = 0;
			if (d !== 0) {
				if (mx === ch[0]) hh = 60 * (((ch[1] - ch[2]) / d) % 6);
				else if (mx === ch[1]) hh = 60 * ((ch[2] - ch[0]) / d + 2);
				else hh = 60 * ((ch[0] - ch[1]) / d + 4);
			}
			return [(hh + 360) % 360, mx === 0 ? 0 : d / mx, mx];
		}

		function openPicker(anchor, key) {
			closePop();
			let hv = hex2hsv(readMap()[key] || "#ffc300");
			pop = document.createElement("div");
			pop.className = "xwc-pop";
			pop.setAttribute("data-context-menu-trigger", "1");
			pop.style.cssText = "flex-direction:column;align-items:stretch;gap:8px;width:250px;padding:10px";
			pop.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); closePop(); });

			const box = (cls, css) => { const d = document.createElement("div"); d.className = cls; d.style.cssText = css; return d; };
			const sv = box("xwc-pk-sv", "position:relative;flex:1 1 auto;min-width:0;height:150px;border-radius:8px;cursor:crosshair;touch-action:none");
			const vsl = box("xwc-pk-v", "position:relative;width:18px;border-radius:6px;cursor:pointer;touch-action:none");
			const hsl = box("xwc-pk-h", "position:relative;width:18px;border-radius:6px;cursor:pointer;touch-action:none");
			const row = box("xwc-pk-row", "display:flex;flex-direction:row;gap:8px;height:150px");
			const thumb = box("xwc-pk-th", "position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,.8);pointer-events:none");
			const vth = box("xwc-pk-th", "position:absolute;left:-2px;right:-2px;height:4px;border-radius:3px;background:#fff;border:1px solid rgba(0,0,0,.4);pointer-events:none");
			const hth = box("xwc-pk-th", "position:absolute;left:-2px;right:-2px;height:4px;border-radius:3px;background:#fff;border:1px solid rgba(0,0,0,.4);pointer-events:none");
			sv.appendChild(thumb); vsl.appendChild(vth); hsl.appendChild(hth);
			row.appendChild(sv); row.appendChild(vsl); row.appendChild(hsl);

			const info = box("xwc-pk-info", "display:flex;flex-direction:row;align-items:center;gap:8px;font-size:12px");
			const prev = box("xwc-pk-prev", "width:26px;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.25)");
			const hexTxt = document.createElement("span"); hexTxt.style.cssText = "min-width:64px;font-family:monospace";
			const rgbTxt = document.createElement("span"); rgbTxt.style.cssText = "opacity:.7";
			info.appendChild(prev); info.appendChild(hexTxt); info.appendChild(rgbTxt);

			const btns = box("xwc-pk-btns", "display:flex;flex-direction:row;gap:8px;justify-content:flex-end");
			const mkBtn = (label, primary, on) => {
				const b = document.createElement("button");
				b.type = "button"; b.textContent = label; b.title = label + "（右键＝直接收板）";
				b.style.cssText = "padding:4px 12px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid rgba(255,255,255,.22);background:" + (primary ? "rgba(255,255,255,.16)" : "transparent") + ";color:inherit";
				b.addEventListener("click", (e) => { e.stopPropagation(); on(); });
				b.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); closePop(); });
				return b;
			};
			btns.appendChild(mkBtn(t("cancel") || "取消", false, () => closePop()));
			btns.appendChild(mkBtn(t("ok") || "确定", true, () => {
				const hex = rgb2hex.apply(null, hsv2rgb(hv[0], hv[1], hv[2]));
				const cs = readCustoms().filter((x) => String(x).toLowerCase() !== hex.toLowerCase());
				cs.push(hex);
				// 封顶由 writeCustoms 统一收（:77 arr.slice(-8)）：原来每点一次「确定」就塞一个近似色，堆成一排（用户图 1 实测 9 个品红块）
				writeCustoms(cs);
				setKeyColor(key, hex);
				closePop();
			}));

			pop.appendChild(row); pop.appendChild(info); pop.appendChild(btns);
			const render = () => {
				const hue = "hsl(" + Math.round(hv[0]) + ",100%,50%)";
				sv.style.background = "linear-gradient(to top,#fff,transparent),linear-gradient(to left," + hue + ",#000)";
				vsl.style.background = "linear-gradient(to top,#fff," + hue + ",#000)";
				hsl.style.background = "linear-gradient(to top,red,yellow,lime,cyan,blue,magenta,red)";
				thumb.style.left = (hv[1] * 100) + "%"; thumb.style.top = ((1 - hv[2]) * 100) + "%";
				thumb.style.transform = "translate(-50%,-50%)";
				vth.style.top = ((1 - hv[2]) * 100) + "%"; vth.style.transform = "translateY(-50%)";
				hth.style.top = ((1 - hv[0] / 360) * 100) + "%"; hth.style.transform = "translateY(-50%)";
				const rgb = hsv2rgb(hv[0], hv[1], hv[2]);
				const hex = rgb2hex(rgb[0], rgb[1], rgb[2]);
				prev.style.background = hex; hexTxt.textContent = hex.toUpperCase();
				rgbTxt.textContent = "R" + rgb[0] + " G" + rgb[1] + " B" + rgb[2];
			};
			const drag = (el, fn) => {
				const move = (e) => {
					const r = el.getBoundingClientRect();
					fn(clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height));
					render();
				};
				el.addEventListener("pointerdown", (e) => {
					e.preventDefault();
					try { el.setPointerCapture(e.pointerId); } catch {}
					move(e);
					const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); };
					el.addEventListener("pointermove", move);
					el.addEventListener("pointerup", up);
				});
			};
			drag(sv, (x, y) => { hv[1] = x; hv[2] = 1 - y; });
			drag(vsl, (x, y) => { hv[2] = 1 - y; });
			drag(hsl, (x, y) => { hv[0] = (1 - y) * 360; });
			render();

			document.body.appendChild(pop);
			const r = anchor.getBoundingClientRect();
			pop.style.left = Math.max(4, r.left) + "px";
			pop.style.top = (r.bottom + 4) + "px";
		}

		function openPop(anchor, key) {
			closePop();
			const current = readMap()[key] || "";
			pop = document.createElement("div");
			pop.className = "xwc-pop";
			pop.setAttribute("data-context-menu-trigger", "1");
			// 右键取消（用户原话「取消，机制 右键 取消」＋选择「弹板里的色块右键＝取消」）：
			// 弹板里任意色块上按右键＝直接清掉这个会话的颜色并收板，不必再点 ✕。
			const cancelByRight = (e) => {
				e.preventDefault();
				e.stopPropagation();
				setKeyColor(key, null);
				closePop();
			};
			// 自定义色块右键＝删掉这个自定义色（用户原话「这 右键取消 自定义色块 无效」：盘上原本没有删除逻辑）
			const delCustom = (hex) => (e) => {
				e.preventDefault();
				e.stopPropagation();
				writeCustoms(readCustoms().filter((x) => x !== hex));
				// 照有效那份 dsh-xwide-annotation:1573 的 renderPanel()：删完原地重画，那块当场少掉。
				// 原来这里 closePop() 把板子收掉＝用户看见的是「一闪没反应」（原话「这 右键取消 自定义色块 无效」）
				openPop(anchor, key);
			};
			const mk = (cls, style, on, title, onClick, onRight, rightHint) => {
				const d = document.createElement("div");
				d.className = cls;
				d.title = title + "（右键＝" + (rightHint || "取消颜色") + "）";
				if (style) d.style.cssText = style;
				if (on) d.setAttribute("data-on", "1");
				d.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
				d.addEventListener("contextmenu", onRight || cancelByRight);
				return d;
			};
			for (const p of PRESETS) pop.appendChild(mk("xwc-sw", "background:" + p.hex, current === p.hex, p.name, () => { setKeyColor(key, p.hex); closePop(); }));
			for (const c of readCustoms()) pop.appendChild(mk("xwc-sw", "background:" + c, current === c, c, () => { setKeyColor(key, c); closePop(); }, delCustom(c), "删除这个自定义色"));
			// 彩虹块＝打开自绘 HSV 取色面板（原来这里弹系统原生 input[type=color]，样式不可控）
			pop.appendChild(mk("xwc-sw xwc-rainbow", "", false, t("custom"), () => openPicker(anchor, key)));
			// 「恢复默认」＝一键清空整排自定义色（用户原话「少一个 恢复默认 的功能」）；
			// 会话行的颜色不动——那是正在用的标记，现有 ✕ 才管它。删完原地重画，跟 delCustom 同一套。
			if (readCustoms().length > 0) {
				const rb = document.createElement("div");
				rb.className = "xwc-reset";
				rb.textContent = t("reset");
				rb.title = t("reset") + "（清空我的颜色）";
				rb.addEventListener("click", (e) => { e.stopPropagation(); writeCustoms([]); openPop(anchor, key); });
				rb.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); });
				pop.appendChild(rb);
			}
			if (current) pop.appendChild(mk("xwc-clear", "", false, t("clear"), () => { setKeyColor(key, null); closePop(); }));
			document.body.appendChild(pop);
			const r = anchor.getBoundingClientRect();
			pop.style.left = Math.max(4, r.left) + "px";
			pop.style.top = (r.bottom + 4) + "px";
		}

		function mountDots() {
			const map = readMap();
			for (const sel of ROW_CANDIDATES) {
				let list;
				try { list = document.querySelectorAll(sel); } catch { continue; }
				list.forEach((el) => {
					const key = rowKeyOf(el);
					if (!key) return;
					let dot = el.querySelector(":scope > .xwc-dot");
					if (!dot) {
						dot = document.createElement("span");
						dot.className = "xwc-dot";
						dot.title = t("title");
						dot.setAttribute("data-context-menu-trigger", "1");
						dot.addEventListener("click", (e) => {
							e.preventDefault();
							e.stopPropagation();
							openPop(dot, key);
						});
						el.insertBefore(dot, el.firstChild);
					}
					const hex = map[key] || "";
					dot.style.background = hex || "transparent";
					dot.setAttribute("data-on", hex ? "1" : "0");
				});
			}
		}

		// ---------- 装载 ----------
		function apply0(ctx) {
			injectCss();
			paintAll();
			mountDots();
			// 侧栏虚拟滚动/重渲染后补色与补点；卸载清掉定时器
			const timer = setInterval(() => {
				paintAll();
				mountDots();
			}, 1500);
			document.addEventListener("pointerdown", (e) => {
				if (pop && !pop.contains(e.target) && !e.target.classList.contains("xwc-dot")) closePop();
			}, true);
			return () => clearInterval(timer);
		}

		exports.apply = apply0;
		// 依赖显式声明：真宿主实测不声明就抛 cannot get property "slots" without inject
		exports.inject = ["slots"];
		return module.exports;
	},
});
