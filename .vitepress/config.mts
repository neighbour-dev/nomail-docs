import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: 'NoMail 文档',
  description: 'NoMail 通知收件箱的使用、自托管部署与平台接入指南',
  srcExclude: ['README.md'],
  cleanUrls: true,
  sitemap: {
    hostname: 'https://nomail.sg'
  },
  themeConfig: {
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
          { text: '认识 NoMail', link: '/guide/introduction' },
          { text: '安装与部署', link: '/guide/install' },
          { text: '连接通知来源', link: '/guide/sources' },
          { text: '凭据加密密钥', link: '/guide/secret-encryption-key' }
        ]
      },
      {
        text: '开发者参考',
        collapsed: true,
        items: [
          { text: 'OpenAPI', link: '/reference/openapi' },
          { text: 'Webhook 配置接口', link: '/reference/webhook-config' },
          { text: '消息游标查询', link: '/reference/message-cursor' },
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
        text: '研究与历史归档',
        collapsed: true,
        items: [
          { text: '主要竞品对比', link: '/research/competitors' },
          { text: '历史接口缺口分析', link: '/archive/missing-apis' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/neighbour-dev/nomail-api' }
    ]
  }
})
