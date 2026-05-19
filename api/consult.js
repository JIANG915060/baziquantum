import fetch from 'node-fetch';

export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, birthChart } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: '问题不能为空' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API配置错误' });
  }

  try {
    // 构建系统提示词
    const systemPrompt = `你是一位深谙八字命理、心理学、人生哲学的智慧导师。用户将向你提问人生重大决策。

你需要：
1. 深入理解用户的具体处境和心理状态
2. 结合用户的八字命盘信息（如果有）提供洞见
3. 融合东方智慧（八字、易经）和西方心理学
4. 给出平衡、中立但有启发性的建议
5. 帮助用户理清思路，而非直接告诉他们做什么

风格要求：
- 深思熟虑，富有哲理性
- 既要尊重用户自由意志，也要提供智慧引导
- 适当引用命理学或心理学概念，但不要过于晦涩
- 篇幅适中（300-500字），深度优于长度
- 中文回答，使用温暖而有权威感的语气`;

    const userMessage = birthChart
      ? `用户的八字信息：${JSON.stringify(birthChart, null, 2)}\n\n用户的问题：${question}`
      : `用户的问题：${question}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('DeepSeek API Error:', error);
      return res.status(response.status).json({
        error: 'AI服务暂时不可用，请稍后重试'
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(500).json({ error: '无法生成答案' });
    }

    res.status(200).json({
      answer,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Consult API Error:', error);
    res.status(500).json({
      error: '服务器错误，请稍后重试'
    });
  }
}
