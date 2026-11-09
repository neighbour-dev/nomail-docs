import type { HeadConfig } from 'vitepress'

export const siteUrl = 'https://nomail.sg'
export const siteName = 'NoMail'
export const publisherName = 'NEIGHBOUR PTE. LTD.'
export const siteDescription = 'Guides to using, self-hosting, and connecting platforms to the NoMail notification inbox'

export function canonicalUrl(relativePath: string): string {
  const url = new URL(relativePath, `${siteUrl}/`)
  const pathname = url.pathname
    .replace(/\/index\.(?:md|html)$/, '/')
    .replace(/\.(?:md|html)$/, '')
  return `${siteUrl}${pathname}`
}

export function verificationHead(env: Record<string, string | undefined>): HeadConfig[] {
  const providers = [
    ['GOOGLE_SITE_VERIFICATION', 'google-site-verification'],
    ['BING_SITE_VERIFICATION', 'msvalidate.01']
  ] as const

  return providers.flatMap(([key, name]): HeadConfig[] => {
    const content = env[key]?.trim()
    return content ? [['meta', { name, content }]] : []
  })
}

type PageSeoInput = {
  relativePath: string
  title: string
  description: string
  noindex?: boolean
  lastUpdated?: number
}

export function pageSeoHead(input: PageSeoInput): HeadConfig[] {
  const url = canonicalUrl(input.relativePath)
  const english = !input.relativePath.startsWith('zh/')
  const language = english ? 'en' : 'zh-CN'
  const sourcePath = input.relativePath.replace(/^zh\//, '')
  const noindex = input.noindex === true
  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: url }],
    ['link', { rel: 'alternate', hreflang: 'zh-CN', href: canonicalUrl(`zh/${sourcePath}`) }],
    ['link', { rel: 'alternate', hreflang: 'en', href: canonicalUrl(sourcePath) }],
    ['link', { rel: 'alternate', hreflang: 'x-default', href: canonicalUrl(sourcePath) }],
    ['meta', { name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: siteName }],
    ['meta', { property: 'og:locale', content: english ? 'en_US' : 'zh_CN' }],
    ['meta', { property: 'og:locale:alternate', content: english ? 'zh_CN' : 'en_US' }],
    ['meta', { property: 'og:title', content: input.title }],
    ['meta', { property: 'og:description', content: input.description }],
    ['meta', { property: 'og:url', content: url }]
  ]

  if (noindex) return head

  const webpage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.title,
    description: input.description,
    inLanguage: language,
    isPartOf: { '@id': `${siteUrl}/#website` }
  }
  if (input.lastUpdated && Number.isFinite(input.lastUpdated)) {
    webpage.dateModified = new Date(input.lastUpdated).toISOString()
  }

  const graph: Record<string, unknown>[] = [webpage]
  if (url === `${siteUrl}/`) {
    graph.push(
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url,
        name: siteName,
        description: input.description,
        inLanguage: ['en', 'zh-CN'],
        publisher: { '@id': `${siteUrl}/#organization` }
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: publisherName
      }
    )
  }

  head.push(['script', { type: 'application/ld+json', id: 'nomail-structured-data' },
    JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')])
  return head
}
