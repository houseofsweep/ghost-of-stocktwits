export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  try {
    // Step 1: initial request with web search
    const r1 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: `Search SEC EDGAR EDGAR full text search at https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&forms=8-K for recent filings. Also search "${ticker} warrant offering 2025 2026 SEC" and "${ticker} capital raise warrant strike price". Then return ONLY a JSON object with: lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, secLink, keyCatalyst. Use null for missing fields.` }]
      })
    })
    const d1 = await r1.json()
    
    // Log stop reason and content types
    const contentTypes = (d1.content||[]).map(b => b.type)
    const stopReason = d1.stop_reason

    // Build conversation for follow-up if tool was used
    let finalText = (d1.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
    let iterations = 0

    let messages = [{ role: 'user', content: `Search SEC EDGAR for ${ticker} 8-K filings and return ONLY JSON with: lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, secLink, keyCatalyst` }]
    let currentContent = d1.content
    let currentStopReason = stopReason

    while (currentStopReason === 'tool_use' && iterations < 5) {
      iterations++
      // Add assistant turn
      messages.push({ role: 'assistant', content: currentContent })
      // Add tool results
      const toolResults = currentContent
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'Search completed - please analyze results and return JSON' }))
      messages.push({ role: 'user', content: toolResults })

      const r2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1200,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages
        })
      })
      const d2 = await r2.json()
      currentContent = d2.content || []
      currentStopReason = d2.stop_reason
      const txt = currentContent.filter(b=>b.type==='text').map(b=>b.text).join('')
      if (txt) finalText = txt
    }

    let parsed = null
    if (finalText) {
      const match = finalText.replace(/```json|```/g,'').match(/\{[\s\S]*\}/)
      if (match) try { parsed = JSON.parse(match[0]) } catch {}
    }

    res.status(200).json({ 
      stopReason, contentTypes, iterations,
      textLength: finalText.length,
      preview: finalText.slice(0, 300),
      parsed 
    })
  } catch(e) {
    res.status(500).json({ error: e.message, stack: e.stack?.slice(0,200) })
  }
}
