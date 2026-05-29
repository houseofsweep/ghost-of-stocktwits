export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  // Test with web search
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: 'Search for OTLK stock short float and return just the percentage you find.' }]
    })
  })

  const status = r.status
  const body = await r.json()
  const contentTypes = (body.content||[]).map(b => b.type)
  const text = (body.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
  const toolUse = (body.content||[]).filter(b=>b.type==='tool_use').map(b=>({ name: b.name, query: b.input?.query }))

  // If tool was used, do follow up
  if (body.stop_reason === 'tool_use') {
    const toolResults = (body.content||[])
      .filter(b=>b.type==='tool_use')
      .map(b=>({ type:'tool_result', tool_use_id: b.id, content: 'Search results returned.' }))

    const r2 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [
          { role: 'user', content: 'Search for OTLK stock short float and return just the percentage.' },
          { role: 'assistant', content: body.content },
          { role: 'user', content: toolResults }
        ]
      })
    })
    const b2 = await r2.json()
    const text2 = (b2.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
    return res.status(200).json({ 
      round1: { status, contentTypes, text, toolUse, stopReason: body.stop_reason },
      round2: { status: r2.status, contentTypes: (b2.content||[]).map(b=>b.type), text: text2, stopReason: b2.stop_reason, error: b2.error }
    })
  }

  res.status(200).json({ status, contentTypes, text, toolUse, stopReason: body.stop_reason, error: body.error })
}
