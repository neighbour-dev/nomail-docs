import { defineConfig } from 'vitepress'
import { canonicalUrl, pageSeoHead, publisherName, siteDescription, siteUrl, verificationHead } from './seo.mts'

const noindexUrls = new Set<string>()

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: 'NoMail 文档',
  titleTemplate: false,
  description: siteDescription,
  srcExclude: ['README.md'],
  cleanUrls: true,
  lastUpdated: true,
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
    // 写入页面数据，让静态 HTML 与客户端路由切换使用同一套元信息。
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
    lastUpdated: {
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'long'
      }
    },
    footer: {
      message: `NoMail · ${publisherName} · <a href="https://github.com/Neighbour-sg/nomail-docs">文档源码</a> · <a href="https://github.com/Neighbour-sg/nomail-docs/blob/main/LICENSE">AGPLv3</a>`
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            displayDetails: '显示详细结果',
            resetButtonTitle: '清除搜索',
            backButtonTitle: '返回',
            noResultsText: '未找到相关结果',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '安装部署', link: '/guide/install' },
      { text: '平台接入', link: '/guide/sources' }
    ],

    sidebar: [
      {
        text: '使用指南',
        items: [
          { text: '指南总览', link: '/guide/' },
          { text: '认识 NoMail', link: '/guide/introduction' },
          { text: '安装与部署', link: '/guide/install' },
          { text: '连接通知来源', link: '/guide/sources' }
        ]
      },
      {
        text: '平台协议参考',
        collapsed: true,
        items: [
          { text: '平台协议总览', link: '/reference/' },
          {
            text: '平台 Webhook 协议',
            collapsed: false,
            items: [
              { text: '总览与通用约定', link: '/reference/webhook-platform-reference-2026-10-30' },
              { text: '协议阅读约定', link: '/reference/webhook-contract-conventions' },
              { text: 'GitHub', link: '/reference/platforms/github' },
              { text: 'GitLab', link: '/reference/platforms/gitlab' },
              { text: 'Stripe', link: '/reference/platforms/stripe' },
              { text: 'Slack', link: '/reference/platforms/slack' },
              { text: '飞书', link: '/reference/platforms/feishu' },
              { text: 'Telegram', link: '/reference/platforms/telegram' },
              { text: 'Shopify', link: '/reference/platforms/shopify' },
              { text: 'Gitea', link: '/reference/platforms/gitea' },
              { text: 'App Store Connect', link: '/reference/platforms/app-store-connect' }
            ]
          }
        ]
      },
      {
        text: '产品研究',
        collapsed: true,
        items: [
          { text: '主要竞品对比', link: '/research/competitors' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/neighbour-dev/nomail-api' }
    ]
  }
})
