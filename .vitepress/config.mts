import { defineConfig } from 'vitepress'
import { chineseSearch, localeTheme } from './locales.mts'
import { canonicalUrl, pageSeoHead, siteDescription, siteUrl, verificationHead } from './seo.mts'

const noindexUrls = new Set<string>()

export default defineConfig({
  lang: 'en',
  title: 'NoMail Docs',
  titleTemplate: false,
  description: siteDescription,
  srcExclude: ['README.md'],
  cleanUrls: true,
  lastUpdated: true,
  locales: {
    root: { label: 'English', lang: 'en', themeConfig: localeTheme() },
    zh: {
      label: '简体中文', lang: 'zh-CN', title: 'NoMail 文档',
      description: 'NoMail 通知收件箱的使用、自托管部署与平台接入指南',
      themeConfig: localeTheme(false)
    }
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ...verificationHead(process.env)
  ],
  transformPageData(pageData) {
    const noindex = pageData.frontmatter.noindex === true
    if (noindex) {
      noindexUrls.add(canonicalUrl(pageData.relativePath))
      pageData.frontmatter.search = false
    }
    // Keep static HTML and client-side navigation metadata in sync.
    pageData.frontmatter.head = [
      ...(pageData.frontmatter.head ?? []),
      ...pageSeoHead({
        relativePath: pageData.relativePath,
        title: pageData.title,
        description: pageData.description,
        lastUpdated: pageData.lastUpdated,
        noindex
      })
    ]
  },
  transformHead({ pageData }) {
    return pageData.isNotFound
      ? [['meta', { name: 'robots', content: 'noindex, follow' }]]
      : []
  },
  sitemap: {
    hostname: siteUrl,
    transformItems: items => items.filter(item => !noindexUrls.has(canonicalUrl(item.url)))
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: { locales: { zh: { translations: chineseSearch } } }
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/neighbour-dev/nomail-api' }]
  }
})
