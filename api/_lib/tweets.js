function extractTweetId(url) {
  if (!url) return null
  const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i)
  return match?.[1] || null
}

async function fetchSyndicationTweet(tweetId) {
  const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PumpCatalog/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.text?.trim() || null
}

async function fetchFxTweet(tweetId) {
  const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PumpCatalog/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.tweet?.text?.trim() || data?.text?.trim() || null
}

export async function fetchTweetText(twitterUrl) {
  const tweetId = extractTweetId(twitterUrl)
  if (!tweetId) return ''

  const syndication = await fetchSyndicationTweet(tweetId)
  if (syndication) return syndication

  const fx = await fetchFxTweet(tweetId)
  if (fx) return fx

  return ''
}
