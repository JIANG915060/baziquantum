export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

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
    console.error('DEEPSEEK_API_KEY not configured');
    return res.status(500).json({ error: 'API密钥未配置，请联系管理员' });
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

    console.log('Calling DeepSeek API...');

    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Bazi-Quantum/1.0'
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

    console.log('DeepSeek response status:', deepseekResponse.status);

    const responseText = await deepseekResponse.text();
    console.log('DeepSeek raw response:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      return res.status(500).json({
        error: 'API响应格式错误，请稍后重试'
      });
    }

    if (!deepseekResponse.ok) {
      console.error('DeepSeek API error response:', data);
      return res.status(deepseekResponse.status).json({
        error: data.error?.message || 'AI服务暂时不可用'
      });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      console.error('No answer in response:', data);
      return res.status(500).json({ error: '无法生成答案' });
    }

    return res.status(200).json({
      answer: answer,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Consult API Error:', error.message, error.stack);
    return res.status(500).json({
      error: '服务器内部错误：' + error.message
    });
  }
}
