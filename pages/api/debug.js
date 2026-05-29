export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHRO,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        tool_choice: { type: 'auto' },
        system: 'You are a financial data extractor. Return ONLY valid JSON.',
        messages: [{
          role: 'user',
          content: `Search for ${ticker} SEC 8-K filings, warrants, capital raises, short float percentage. Then return ONLY a JSON object with these fields (null if not found): shortFloat, warrantStrike, warrantExpiry, warrantShares, lastRaiseAmount, lastRaiseType, lastRaiseDate, leadInvestors, dilutionNote, keyCatalyst`
        }]
      })
    })

    const raw = await r.json()
    const stopReason = raw.stop_reason
    const contentTypes = (raw.content||[]).map(b => b.type)
    const text = (raw.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
    const toolInputs = (raw.content||[]).filter(b=>b.type==='tool_use').map(b=>({ name: b.name, input: b.input }))

    // If tool used, do follow up
    let followUpText = ''
    if (stopReason === 'tool_use') {
      const toolResults = (raw.content||[])
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'Search results retrieved successfully.' }))

      const r2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: 'You are a financial data extractor. Return ONLY valid JSON, no markdown.',
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [
            { role: 'user', content: `Search for ${ticker} SEC 8-K filings, warrants, capital raises, short float. Return ONLY JSON.` },
            { role: 'assistant', content: raw.content },
            { role: 'user', content: toolResults }
          ]
        })
      })
      const d2 = await r2.json()
      followUpText = (d2.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
      const r2Types = (d2.content||[]).map(b=>b.type)

      return res.status(200).json({
        round1: { status: r.status, stopReason, contentTypes, textLength: text.length, toolInputs },
        round2: { stopReason: d2.stop_reason, contentTypes: r2Types, textLength: followUpText.length, preview: followUpText.slice(0,500) }
      })
    }

    return res.status(200).json({
      round1: { status: r.status, stopReason, contentTypes, textLength: text.length, preview: text.slice(0,500) }
    })

  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
