import type { DefaultTheme } from 'vitepress'
import { publisherName } from './seo.mts'

export function localeTheme(english = true): DefaultTheme.Config {
  const text = (zh: string, en: string) => english ? en : zh
  const link = (path: string) => `${english ? '' : '/zh'}${path}`

  return {
    siteTitle: text('NoMail 文档', 'NoMail Docs'),
    langMenuLabel: text('切换语言', 'Change language'),
    returnToTopLabel: text('返回顶部', 'Return to top'),
    sidebarMenuLabel: text('菜单', 'Menu'),
    darkModeSwitchLabel: text('主题', 'Appearance'),
    lightModeSwitchTitle: text('切换到浅色模式', 'Switch to light theme'),
    darkModeSwitchTitle: text('切换到深色模式', 'Switch to dark theme'),
    outline: { label: text('本页目录', 'On this page') },
    docFooter: { prev: text('上一页', 'Previous page'), next: text('下一页', 'Next page') },
    lastUpdated: {
      text: text('最后更新于', 'Last updated'),
      formatOptions: { dateStyle: 'medium', timeStyle: 'long' }
    },
    notFound: {
      title: text('页面未找到', 'PAGE NOT FOUND'),
      quote: text('页面可能已移动，请返回首页或使用搜索。', 'This page may have moved. Return home or try searching.'),
      linkLabel: text('返回首页', 'Go to home'),
      linkText: text('返回首页', 'Take me home')
    },
    footer: {
      message: `NoMail · ${publisherName} · <a href="https://github.com/Neighbour-sg/nomail-docs">${text('文档源码', 'Documentation source')}</a> · <a href="https://github.com/Neighbour-sg/nomail-docs/blob/main/LICENSE">AGPLv3</a>`
    },
    nav: [
      { text: text('首页', 'Home'), link: link('/') },
      { text: text('安装部署', 'Installation'), link: link('/guide/install') },
      { text: text('平台接入', 'Connect sources'), link: link('/guide/sources') }
    ],
    sidebar: [
      {
        text: text('使用指南', 'User guide'),
        items: [
          { text: text('指南总览', 'Overview'), link: link('/guide/') },
          { text: text('认识 NoMail', 'About NoMail'), link: link('/guide/introduction') },
          {
            text: text('安装与部署', 'Installation and deployment'), link: link('/guide/install'), collapsed: false,
            items: [
              { text: 'Docker Compose', link: link('/guide/install/docker') },
              { text: text('发布二进制', 'Release binaries'), link: link('/guide/install/binary') },
              { text: text('源码构建', 'Build from source'), link: link('/guide/install/source') },
              { text: 'Cloudflare Workers', link: link('/guide/install/workers') }
            ]
          },
          { text: text('版本升级', 'Upgrading'), link: link('/guide/upgrade') },
          { text: text('连接通知来源', 'Connect notification sources'), link: link('/guide/sources') }
        ]
      },
      {
        text: text('平台协议参考', 'Platform protocol reference'), collapsed: true,
        items: [
          { text: text('平台协议总览', 'Reference overview'), link: link('/reference/') },
          {
            text: text('平台 Webhook 协议', 'Platform Webhook protocols'), collapsed: false,
            items: [
              { text: text('总览与通用约定', 'Index and common conventions'), link: link('/reference/webhook-platform-reference-2026-10-30') },
              { text: text('协议阅读约定', 'How to read the contracts'), link: link('/reference/webhook-contract-conventions') },
              ...[
                ['GitHub', 'github'], ['GitLab', 'gitlab'], ['Stripe', 'stripe'], ['Slack', 'slack'],
                [text('飞书', 'Feishu'), 'feishu'], ['Telegram', 'telegram'], ['Shopify', 'shopify'],
                ['Gitea', 'gitea'], ['App Store Connect', 'app-store-connect']
              ].map(([name, slug]) => ({ text: name, link: link(`/reference/platforms/${slug}`) }))
            ]
          }
        ]
      },
      {
        text: text('产品研究', 'Product research'), collapsed: true,
        items: [{ text: text('主要竞品对比', 'Competitor comparison'), link: link('/research/competitors') }]
      }
    ]
  }
}

export const chineseSearch = {
  button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
  modal: {
    displayDetails: '显示详细结果', resetButtonTitle: '清除搜索', backButtonTitle: '返回', noResultsText: '未找到相关结果',
    footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
  }
}
