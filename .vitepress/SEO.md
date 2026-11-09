# SEO 维护约定

本文件面向文档站维护者，不作为公开页面构建；README 只保留项目介绍。

## 页面元信息

| 配置 | 规则 |
|---|---|
| `title` | 由 VitePress 内置逻辑解析；当前页面自行包含 NoMail，全局关闭自动后缀，避免重复品牌名 |
| `description` | 使用 VitePress 内置的页面描述和全局回退机制；建议每页提供独立摘要 |
| H1 | 一页一个可见主标题；首页使用 Hero 的 H1，正文从 H2 开始 |
| `noindex: true` | 保留页面访问，但生成 noindex、移出 sitemap 并关闭本地搜索收录 |
| Git 更新时间 | 启用 VitePress 内置 lastUpdated，使用框架计算的更新时间生成 dateModified/lastmod |
| Canonical | 使用 `https://nomail.sg` 和简洁路径；目录索引保留尾部斜杠 |
| 暂不索引的页面 | 保留可抓取状态，使用 noindex，不在 robots.txt 中 Disallow |
| README | 仅用于仓库介绍，排除公开站点构建 |
| 多语言 | 默认英文使用根路径，中文使用 `/zh/`；每页自引用 Canonical，并为对应页面输出 zh-CN、en 和指向英文的 x-default hreflang |

中英文页面保持相同的目录结构。Open Graph locale 和 WebPage.inLanguage 根据页面路径生成，WebSite 声明中英文两种语言。新增页面必须同时提供对应译文，避免语言切换或 hreflang 指向不存在的页面。

`.vitepress/seo.mts` 统一生成 Canonical、Open Graph 文本元信息和 JSON-LD。元信息写入 frontmatter.head，因此静态 HTML 与客户端跳转一致。首页仅声明站点与已知出版主体，文档使用 WebPage，不编造应用评分、商店链接、作者或发布日期。不提供分享封面、Twitter 卡片、Apple 主屏幕图标或面包屑（包括结构化数据）。

标题、description 标签、更新时间、sitemap 和源码排除使用 VitePress 内置能力，不在 SEO 模块中重新实现。SEO 模块直接使用框架解析后的页面数据，不额外强制标题或描述非空。README 通过 srcExclude 排除，404 通过框架的 isNotFound 标记处理，不再维护重复的路径黑名单。

## 图片与抓取

| 文件/配置 | 作用 |
|---|---|
| `public/favicon.svg` | SVG 网站图标 |
| `public/favicon-32.png` | 32×32 PNG 网站图标 |
| `public/robots.txt` | 允许正式内容抓取并声明 sitemap |
| `public/_redirects` | 将旧 .html、index 别名和指南/参考目录入口永久跳转到规范地址 |
| `public/_headers` | 404 页 noindex 响应头；对哈希资源设置长期浏览器缓存，不长期缓存 HTML |

favicon 作为静态资源随仓库保存，构建时不生成图片；修改图标时同步更新 SVG 和 PNG。

更新时间由 VitePress 根据构建环境中的 Git 历史计算，不额外检查浅克隆状态；构建脚本不会自动 fetch 或访问远程仓库。

更新时间展示使用 VitePress 内置 formatOptions（dateStyle: medium、timeStyle: long），显示时区标识；不指定 timeZone，默认使用用户浏览器的本地时区。

## 搜索引擎站点验证

拿到自己账号的验证值后，在构建环境传入下列变量；未提供时不会输出假验证标签：

| 环境变量 | 生成标签 |
|---|---|
| `GOOGLE_SITE_VERIFICATION` | google-site-verification |
| `BING_SITE_VERIFICATION` | msvalidate.01 |

这只提供验证代码入口，不代替 Search Console / Bing 控制台中的账号验证、sitemap 提交或实际收录。变量在构建时读取，不自动加载 `.env`，也不是 Cloudflare API 凭据。

## 构建

| 命令 | 作用 |
|---|---|
| `pnpm docs:build` | 使用 VitePress 构建文档站 |

生产发布由 GitHub Actions 监听 `main` 分支的 push 事件触发，工作流构建后使用 Wrangler 部署到 Cloudflare，不提供本地 CLI 发布脚本。

线上还需确认 Cloudflare 未阻挡合法搜索引擎、实际 HTTPS/域名跳转正确、自动注入的 Web Analytics 正常工作。这些属于账号/边缘配置，不能仅凭本地构建确认。
