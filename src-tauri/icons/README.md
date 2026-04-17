# Kerdos Desktop Icons — Placeholder

该目录当前是 **占位目录**。真实品牌 icon 将在 **W4 阶段** 替换进来（见 Tauri 2 打包规范）。

## Tauri 2 需要的 icon 清单

当 `tauri build` / `tauri dev` 打包时，`tauri.conf.json > bundle.icon` 会引用以下文件。
**在 W4 把真实素材放入本目录之前，打包会失败，这是预期行为**。

| 文件 | 用途 | 平台 |
| --- | --- | --- |
| `32x32.png` | 通用 PNG（小尺寸） | 所有平台 |
| `128x128.png` | 通用 PNG（标准） | 所有平台 |
| `128x128@2x.png` | 通用 PNG（Retina） | 所有平台 |
| `icon.icns` | macOS app icon | macOS（`.dmg`） |
| `icon.ico` | Windows app icon | Windows（`.exe` / `.msi`） |
| `Square30x30Logo.png` | MS Store / MSIX | Windows |
| `Square44x44Logo.png` | MS Store / MSIX | Windows |
| `Square71x71Logo.png` | MS Store / MSIX | Windows |
| `Square89x89Logo.png` | MS Store / MSIX | Windows |
| `Square107x107Logo.png` | MS Store / MSIX | Windows |
| `Square142x142Logo.png` | MS Store / MSIX | Windows |
| `Square150x150Logo.png` | MS Store / MSIX | Windows |
| `Square284x284Logo.png` | MS Store / MSIX | Windows |
| `Square310x310Logo.png` | MS Store / MSIX | Windows |
| `StoreLogo.png` | MS Store / MSIX | Windows |

## 生成方式（W4 阶段参考）

Tauri 官方提供 CLI 一键生成（输入一张 1024x1024 源图即可）：

```bash
npx @tauri-apps/cli icon path/to/kerdos-logo-1024.png
```

该命令会一次性产出本目录所有需要的 icon 文件。

## 当前状态

- [x] 目录已创建
- [ ] 真实 icon（W4）
