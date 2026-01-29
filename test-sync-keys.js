/**
 * 测试同步 OpenAI Keys 接口
 * 使用方法：node test-sync-keys.js
 */

// 需要先设置环境变量或直接修改下面的值
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kstwkcdmqzvhzjhnaopw.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

async function testSyncKeys() {
  console.log('🔍 开始测试同步 OpenAI Keys 接口...\n');

  // 1. 先获取平台账号列表
  console.log('1️⃣ 获取平台账号列表...');
  try {
    const accountsResponse = await fetch(`${SUPABASE_URL}/rest/v1/llm_platform_accounts?platform=eq.openai&status=eq.active&select=id,name,platform,project_id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!accountsResponse.ok) {
      console.error('❌ 获取平台账号失败:', await accountsResponse.text());
      return;
    }

    const accounts = await accountsResponse.json();
    console.log(`✅ 找到 ${accounts.length} 个 OpenAI 平台账号`);
    
    if (accounts.length === 0) {
      console.log('⚠️  没有找到 OpenAI 平台账号，请先在 Platform Accounts 页面配置');
      return;
    }

    const account = accounts[0];
    console.log(`   账号 ID: ${account.id}`);
    console.log(`   账号名称: ${account.name}`);
    console.log(`   Project ID: ${account.project_id || '(未配置)'}\n`);

    if (!account.project_id) {
      console.log('⚠️  该账号没有配置 Project ID，无法同步 Keys');
      return;
    }

    // 2. 测试同步 Keys 接口
    console.log('2️⃣ 调用同步 Keys 接口...');
    console.log(`   URL: ${API_BASE_URL}/openai/list-keys`);
    console.log(`   Platform Account ID: ${account.id}\n`);

    // 注意：这里需要真实的用户 token，如果是本地测试，可能需要手动设置
    const testResponse = await fetch(`${API_BASE_URL}/openai/list-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE' // 需要真实的用户 token
      },
      body: JSON.stringify({
        platform_account_id: account.id
      })
    });

    const responseText = await testResponse.text();
    console.log(`   状态码: ${testResponse.status}`);
    console.log(`   响应: ${responseText}\n`);

    if (testResponse.ok) {
      const data = JSON.parse(responseText);
      console.log(`✅ 同步成功！`);
      console.log(`   找到 ${data.total || 0} 个 Keys`);
      if (data.keys && data.keys.length > 0) {
        console.log('\n   Keys 列表:');
        data.keys.forEach((key, index) => {
          console.log(`   ${index + 1}. ${key.name} (${key.id})`);
        });
      }
    } else {
      console.log('❌ 同步失败');
      try {
        const errorData = JSON.parse(responseText);
        console.log(`   错误: ${errorData.error}`);
      } catch (e) {
        console.log(`   错误: ${responseText}`);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testSyncKeys();

