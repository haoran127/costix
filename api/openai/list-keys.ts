import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { admin_key, project_id } = req.body;

    if (!admin_key) {
      return res.status(400).json({ success: false, error: '缺少 Admin Key' });
    }
    if (!project_id) {
      return res.status(400).json({ success: false, error: '缺少 Project ID' });
    }

    // 调用 OpenAI API 列出 Keys
    const openaiResponse = await fetch(
      `https://api.openai.com/v1/organization/projects/${project_id}/api_keys?limit=100`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${admin_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const openaiData = await openaiResponse.json();

    if (!openaiResponse.ok || openaiData.error) {
      return res.status(openaiResponse.status || 400).json({
        success: false,
        error: openaiData.error?.message || 'OpenAI API 调用失败',
        code: openaiData.error?.code,
      });
    }

    // 处理返回的 Keys 列表
    const keys = openaiData.data || [];
    const formattedKeys = keys.map((key: any) => ({
      id: key.id,
      name: key.name,
      redacted_value: key.redacted_value,
      created_at: key.created_at ? new Date(key.created_at * 1000).toISOString() : null,
      owner: key.owner,
      platform: 'openai',
      project_id,
    }));

    return res.status(200).json({
      success: true,
      keys: formattedKeys,
      total: formattedKeys.length,
      has_more: openaiData.has_more || false,
    });
  } catch (error) {
    console.error('列出 OpenAI Keys 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '列出 Keys 失败',
    });
  }
}

