import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { admin_key } = req.body;

    if (!admin_key) {
      return res.status(400).json({ success: false, error: '缺少 Admin Key' });
    }

    // 调用 OpenAI API 列出项目
    const openaiResponse = await fetch(
      'https://api.openai.com/v1/organization/projects?limit=100&include_archived=false',
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

    // 处理返回的 Projects 列表
    const projects = openaiData.data || [];
    const formattedProjects = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      created_at: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
    }));

    return res.status(200).json({
      success: true,
      projects: formattedProjects,
      total: formattedProjects.length,
    });
  } catch (error) {
    console.error('列出 OpenAI Projects 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '列出 Projects 失败',
    });
  }
}

